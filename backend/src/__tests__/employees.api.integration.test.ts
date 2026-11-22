import 'dotenv/config';
import { signedInAgent } from './helpers/auth';
import { Pool } from 'pg';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import type { Express } from 'express';
import { createApp } from '../app';
import { closePool } from '../db/pool';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const APP_DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool;
let app: Express;
let agent: Awaited<ReturnType<typeof signedInAgent>>;

beforeAll(async () => {
  if (!TEST_DATABASE_URL || TEST_DATABASE_URL === APP_DATABASE_URL) {
    throw new Error('Set TEST_DATABASE_URL to a disposable database, different from DATABASE_URL.');
  }
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  pool = new Pool({ connectionString: TEST_DATABASE_URL });
  await pool.query('DROP TABLE IF EXISTS salary_history, employees, currencies, users, report_data_version, pgmigrations CASCADE');
  execFileSync('npm', ['run', 'migrate', '--', '-d', 'TEST_DATABASE_URL'], {
    cwd: join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'inherit',
  });

  await pool.query(`INSERT INTO currencies (code, name) VALUES ('INR', 'Indian Rupee'), ('USD', 'US Dollar')`);

  // Fixture: 28 employees.
  //  - two "Aaa Duplicate" (sort first, same name → id tie-break)
  //  - 25 "Name NNN" (India / Engineering / Software Engineer)
  //  - one "Zzz Target" that sorts LAST (so it's on page 2 unfiltered), in a
  //    different country/department/title so filters can single it out.
  const fixtures: Array<[string, string, string, string, string, string]> = [
    ['EMP-DUP-1', 'Aaa Duplicate', 'India', 'Engineering', 'Software Engineer', 'INR'],
    ['EMP-DUP-2', 'Aaa Duplicate', 'India', 'Engineering', 'Software Engineer', 'INR'],
  ];
  for (let n = 1; n <= 25; n++) {
    fixtures.push([`EMP-${String(n).padStart(3, '0')}`, `Name ${String(n).padStart(3, '0')}`, 'India', 'Engineering', 'Software Engineer', 'INR']);
  }
  fixtures.push(['EMP-TARGET', 'Zzz Target', 'United States', 'Sales', 'Sales Manager', 'USD']);

  for (const [id, name, country, department, jobTitle, currency] of fixtures) {
    await pool.query(
      `INSERT INTO employees (id, name, email, country, department, job_title, currency, annual_salary, joined_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 500000.00, '2021-06-01')`,
      [id, name, `${id.toLowerCase()}@test.example`, country, department, jobTitle, currency],
    );
  }

  app = createApp();
  agent = await signedInAgent(app, pool);
});

afterAll(async () => {
  process.env.DATABASE_URL = APP_DATABASE_URL;
  await closePool();
  await pool?.end();
});

describe('GET /api/employees — pagination', () => {
  it('defaults to page 1 and returns rows, page, pageSize, and total', async () => {
    const res = await agent.get('/api/employees');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.total).toBe(28);
    expect(res.body.rows).toHaveLength(10);

    // Ordered by name, then id: the two "Aaa Duplicate" rows come first.
    expect(res.body.rows[0].id).toBe('EMP-DUP-1');
    expect(res.body.rows[1].id).toBe('EMP-DUP-2');
    expect(typeof res.body.rows[0].salary).toBe('string');
  });

  it('page two returns different rows, with the same total', async () => {
    const p1 = await agent.get('/api/employees').query({ page: 1 });
    const p2 = await agent.get('/api/employees').query({ page: 2 });

    expect(p2.body.page).toBe(2);
    expect(p2.body.rows).toHaveLength(10);
    expect(p1.body.total).toBe(28);
    expect(p2.body.total).toBe(28);

    const idsOnPageOne = new Set(p1.body.rows.map((r: { id: string }) => r.id));
    const pageTwoIds = p2.body.rows.map((r: { id: string }) => r.id);
    expect(pageTwoIds.every((id: string) => !idsOnPageOne.has(id))).toBe(true);
  });

  it('returns 400 when page is not a positive whole number', async () => {
    for (const bad of ['0', '-1', '1.5', 'abc']) {
      const res = await agent.get('/api/employees').query({ page: bad });
      expect(res.status).toBe(400);
    }
  });
});

describe('GET /api/employees — search', () => {
  it('finds an employee who is on a later page when unfiltered, on the first filtered page', async () => {
    // Unfiltered, the target sorts last so it is not on the first page.
    const unfilteredP1 = await agent.get('/api/employees').query({ page: 1 });
    expect(unfilteredP1.body.rows.map((r: { id: string }) => r.id)).not.toContain('EMP-TARGET');

    // Searching finds it on page 1 of the filtered results.
    const search = await agent.get('/api/employees').query({ search: 'Zzz Target', page: 1 });
    expect(search.body.total).toBe(1);
    expect(search.body.rows).toHaveLength(1);
    expect(search.body.rows[0].id).toBe('EMP-TARGET');
  });

  it('is case-insensitive and also matches on employee id', async () => {
    const byLowerName = await agent.get('/api/employees').query({ search: 'zzz target' });
    expect(byLowerName.body.rows.map((r: { id: string }) => r.id)).toEqual(['EMP-TARGET']);

    const byId = await agent.get('/api/employees').query({ search: 'emp-target' });
    expect(byId.body.rows.map((r: { id: string }) => r.id)).toEqual(['EMP-TARGET']);
  });
});

describe('GET /api/employees — filters', () => {
  it('filters by country', async () => {
    const res = await agent.get('/api/employees').query({ country: 'United States' });
    expect(res.body.total).toBe(1);
    expect(res.body.rows.every((r: { country: string }) => r.country === 'United States')).toBe(true);
  });

  it('filters by department and by job title', async () => {
    const byDept = await agent.get('/api/employees').query({ department: 'Sales' });
    expect(byDept.body.rows.map((r: { id: string }) => r.id)).toEqual(['EMP-TARGET']);

    const byTitle = await agent.get('/api/employees').query({ jobTitle: 'Sales Manager' });
    expect(byTitle.body.rows.map((r: { id: string }) => r.id)).toEqual(['EMP-TARGET']);
  });
});

describe('GET /api/employees/filters', () => {
  it('returns the distinct, sorted filter options', async () => {
    const res = await agent.get('/api/employees/filters');

    expect(res.status).toBe(200);
    expect(res.body.countries).toEqual(['India', 'United States']);
    expect(res.body.departments).toEqual(['Engineering', 'Sales']);
    expect(res.body.jobTitles).toEqual(['Sales Manager', 'Software Engineer']);
  });
});

describe('GET /api/employees/:id', () => {
  it('returns the employee with the expected fields', async () => {
    const res = await agent.get('/api/employees/EMP-TARGET');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 'EMP-TARGET',
      name: 'Zzz Target',
      country: 'United States',
      department: 'Sales',
      jobTitle: 'Sales Manager',
      currency: 'USD',
    });
    expect(typeof res.body.salary).toBe('string');
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it('returns 404 for an unknown employee id', async () => {
    const res = await agent.get('/api/employees/EMP-DOES-NOT-EXIST');
    expect(res.status).toBe(404);
  });
});
