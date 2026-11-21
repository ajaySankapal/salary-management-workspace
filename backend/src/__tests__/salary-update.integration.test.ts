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

async function currentSalary(): Promise<string> {
  const r = await pool.query('SELECT annual_salary FROM employees WHERE id = $1', ['EMP-UPD']);
  return r.rows[0].annual_salary;
}

async function historyCount(): Promise<number> {
  const r = await pool.query('SELECT count(*)::int AS c FROM salary_history WHERE employee_id = $1', ['EMP-UPD']);
  return r.rows[0].c;
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
  await pool.query(`INSERT INTO currencies (code, name) VALUES ('INR', 'Indian Rupee')`);

  app = createApp();
});

// Fresh employee (salary 1,000,000, no history) before each test.
beforeEach(async () => {
  await pool.query('DELETE FROM salary_history');
  await pool.query('DELETE FROM employees');
  await pool.query(
    `INSERT INTO employees (id, name, email, country, department, job_title, currency, annual_salary, joined_date)
     VALUES ('EMP-UPD', 'Test Person', 'test.person@test.example', 'India', 'Engineering', 'Software Engineer', 'INR', 1000000.00, '2020-01-01')`,
  );
});

afterAll(async () => {
  process.env.DATABASE_URL = APP_DATABASE_URL;
  await closePool();
  await pool?.end();
});

describe('POST /api/employees/:id/salary', () => {
  it('rejects an invalid amount without changing salary or history', async () => {
    const res = await request(app)
      .post('/api/employees/EMP-UPD/salary')
      .send({ amount: '0', reason: 'Annual raise', previousAmount: '1000000.00' });

    expect(res.status).toBe(400);
    expect(await currentSalary()).toBe('1000000.00');
    expect(await historyCount()).toBe(0);
  });

  it('rejects a blank reason without changing salary or history', async () => {
    const res = await request(app)
      .post('/api/employees/EMP-UPD/salary')
      .send({ amount: '1200000', reason: '   ', previousAmount: '1000000.00' });

    expect(res.status).toBe(400);
    expect(await currentSalary()).toBe('1000000.00');
    expect(await historyCount()).toBe(0);
  });

  it('applies a valid update and records exactly one history entry', async () => {
    const res = await request(app)
      .post('/api/employees/EMP-UPD/salary')
      .send({ amount: '1200000', reason: 'Annual raise', previousAmount: '1000000.00' });

    expect(res.status).toBe(200);
    expect(res.body.salary).toBe('1200000.00');
    expect(await currentSalary()).toBe('1200000.00');
    expect(await historyCount()).toBe(1);

    const h = await pool.query(
      'SELECT previous_amount, new_amount, reason FROM salary_history WHERE employee_id = $1',
      ['EMP-UPD'],
    );
    expect(h.rows[0]).toMatchObject({
      previous_amount: '1000000.00',
      new_amount: '1200000.00',
      reason: 'Annual raise',
    });
  });

  it('rejects a stale edit (older version) without changing salary or history', async () => {
    const res = await request(app)
      .post('/api/employees/EMP-UPD/salary')
      .send({ amount: '1300000', reason: 'Annual raise', previousAmount: '900000.00' }); // wrong previous

    expect(res.status).toBe(409);
    expect(await currentSalary()).toBe('1000000.00');
    expect(await historyCount()).toBe(0);
  });
});
