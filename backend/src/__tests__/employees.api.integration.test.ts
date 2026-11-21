import 'dotenv/config';
import request from 'supertest';
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

beforeAll(async () => {
  if (!TEST_DATABASE_URL || TEST_DATABASE_URL === APP_DATABASE_URL) {
    throw new Error('Set TEST_DATABASE_URL to a disposable database, different from DATABASE_URL.');
  }
  // Point the app's connection pool at the test database.
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  pool = new Pool({ connectionString: TEST_DATABASE_URL });
  await pool.query('DROP TABLE IF EXISTS salary_history, employees, currencies, pgmigrations CASCADE');
  execFileSync('npm', ['run', 'migrate', '--', '-d', 'TEST_DATABASE_URL'], {
    cwd: join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'inherit',
  });

  // Fixture: 27 employees (> one page of 25), including two who share a name
  // so we can check the id tie-break in the ordering.
  await pool.query(`INSERT INTO currencies (code, name) VALUES ('INR', 'Indian Rupee')`);

  const fixtures: Array<[string, string, string]> = [
    ['EMP-DUP-1', 'Aaa Duplicate', '100000.00'],
    ['EMP-DUP-2', 'Aaa Duplicate', '200000.00'],
  ];
  for (let n = 1; n <= 25; n++) {
    fixtures.push([`EMP-${String(n).padStart(3, '0')}`, `Name ${String(n).padStart(3, '0')}`, `${300000 + n}.50`]);
  }
  for (const [id, name, salary] of fixtures) {
    await pool.query(
      `INSERT INTO employees (id, name, country, department, job_title, currency, annual_salary)
       VALUES ($1, $2, 'India', 'Engineering', 'Software Engineer', 'INR', $3)`,
      [id, name, salary],
    );
  }

  app = createApp();
});

afterAll(async () => {
  process.env.DATABASE_URL = APP_DATABASE_URL;
  await closePool();
  await pool?.end();
});

describe('GET /api/employees', () => {
  it('defaults to page 1 and returns rows, page, pageSize, and total', async () => {
    const res = await request(app).get('/api/employees');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(25);
    expect(res.body.total).toBe(27);
    expect(res.body.rows).toHaveLength(25);

    // Ordered by name, then id: the two "Aaa Duplicate" rows come first,
    // tie broken by id (EMP-DUP-1 before EMP-DUP-2).
    expect(res.body.rows[0]).toEqual({
      id: 'EMP-DUP-1',
      name: 'Aaa Duplicate',
      country: 'India',
      jobTitle: 'Software Engineer',
      salary: '100000.00',
      currency: 'INR',
    });
    expect(res.body.rows[1].id).toBe('EMP-DUP-2');
    expect(typeof res.body.rows[0].salary).toBe('string');
  });

  it('page two has the remaining rows, same total, and no overlap with page one', async () => {
    const p1 = await request(app).get('/api/employees?page=1');
    const p2 = await request(app).get('/api/employees?page=2');

    expect(p2.status).toBe(200);
    expect(p2.body.page).toBe(2);
    expect(p2.body.rows).toHaveLength(2);
    expect(p1.body.total).toBe(27);
    expect(p2.body.total).toBe(27); // same total on both pages

    const idsOnPageOne = new Set(p1.body.rows.map((r: { id: string }) => r.id));
    const pageTwoIds = p2.body.rows.map((r: { id: string }) => r.id);
    expect(pageTwoIds.every((id: string) => !idsOnPageOne.has(id))).toBe(true);
  });

  it('returns 400 when page is not a positive whole number', async () => {
    for (const bad of ['0', '-1', '1.5', 'abc']) {
      const res = await request(app).get(`/api/employees?page=${bad}`);
      expect(res.status).toBe(400);
    }
  });
});
