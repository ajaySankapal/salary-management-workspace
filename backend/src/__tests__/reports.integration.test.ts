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

interface EmpOptions {
  country?: string;
  department?: string;
  jobTitle?: string;
  currency?: string;
  salary: number;
}

async function insertEmp(id: string, opts: EmpOptions) {
  const { country = 'India', department = 'Engineering', jobTitle = 'Software Engineer', currency = 'INR', salary } = opts;
  await pool.query(
    `INSERT INTO employees (id, name, email, country, department, job_title, currency, annual_salary, joined_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '2020-01-01')`,
    [id, id, `${id.toLowerCase()}@test.example`, country, department, jobTitle, currency, salary],
  );
}

beforeAll(async () => {
  if (!TEST_DATABASE_URL || TEST_DATABASE_URL === APP_DATABASE_URL) {
    throw new Error('Set TEST_DATABASE_URL to a disposable database, different from DATABASE_URL.');
  }
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  pool = new Pool({ connectionString: TEST_DATABASE_URL });
  await pool.query('DROP TABLE IF EXISTS salary_history, employees, currencies, pgmigrations CASCADE');
  execFileSync('npm', ['run', 'migrate', '--', '-d', 'TEST_DATABASE_URL'], {
    cwd: join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'inherit',
  });
  await pool.query(`INSERT INTO currencies (code, name) VALUES ('INR', 'Indian Rupee'), ('USD', 'US Dollar')`);

  app = createApp();
});

beforeEach(async () => {
  await pool.query('DELETE FROM salary_history');
  await pool.query('DELETE FROM employees');
});

afterAll(async () => {
  process.env.DATABASE_URL = APP_DATABASE_URL;
  await closePool();
  await pool?.end();
});

describe('GET /api/reports', () => {
  it('computes count, median, and average for an odd number of salaries', async () => {
    await insertEmp('A', { salary: 100 });
    await insertEmp('B', { salary: 200 });
    await insertEmp('C', { salary: 300 });

    const res = await request(app).get('/api/reports').query({ groupBy: 'country' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { group: 'India', currency: 'INR', count: 3, median: '200.00', average: '200.00' },
    ]);
  });

  it('computes the median of an even number of salaries', async () => {
    await insertEmp('A', { salary: 100 });
    await insertEmp('B', { salary: 200 });

    const res = await request(app).get('/api/reports').query({ groupBy: 'country' });

    expect(res.body[0]).toMatchObject({ count: 2, median: '150.00', average: '150.00' });
  });

  it('returns an empty list when nothing matches', async () => {
    await insertEmp('A', { salary: 100 });

    const res = await request(app).get('/api/reports').query({ groupBy: 'country', country: 'Nowhere' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('separates statistics per currency (INR and USD)', async () => {
    await insertEmp('A', { salary: 100, currency: 'INR' });
    await insertEmp('B', { salary: 200, currency: 'INR' });
    await insertEmp('C', { country: 'United States', currency: 'USD', salary: 1000 });

    const res = await request(app).get('/api/reports').query({ groupBy: 'jobTitle' });

    // Same job title, two currencies -> two rows with separate stats.
    const inr = res.body.find((r: { currency: string }) => r.currency === 'INR');
    const usd = res.body.find((r: { currency: string }) => r.currency === 'USD');
    expect(inr).toMatchObject({ group: 'Software Engineer', count: 2, median: '150.00' });
    expect(usd).toMatchObject({ group: 'Software Engineer', count: 1, median: '1000.00' });
  });

  it('uses the current salary: 100 & 200 -> change 100 to 400 -> count 2, median 300', async () => {
    await insertEmp('A', { salary: 100 });
    await insertEmp('B', { salary: 200 });

    const before = await request(app).get('/api/reports').query({ groupBy: 'country' });
    expect(before.body[0]).toMatchObject({ count: 2, median: '150.00' });

    await pool.query(`UPDATE employees SET annual_salary = 400 WHERE id = 'A'`);

    const after = await request(app).get('/api/reports').query({ groupBy: 'country' });
    expect(after.body[0]).toMatchObject({ count: 2, median: '300.00' });
  });

  it('rejects an invalid groupBy', async () => {
    const res = await request(app).get('/api/reports').query({ groupBy: 'salary' });
    expect(res.status).toBe(400);
  });
});
