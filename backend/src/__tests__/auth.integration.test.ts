import 'dotenv/config';
import request from 'supertest';
import { Pool } from 'pg';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import type { Express } from 'express';
import { createApp } from '../app';
import { closePool } from '../db/pool';
import { seedDemoUser } from '../seed/seed';
import { DEMO_HR_ACCOUNT } from '../auth/demoAccount';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const APP_DATABASE_URL = process.env.DATABASE_URL;

let pool: Pool;
let app: Express;

beforeAll(async () => {
  if (!TEST_DATABASE_URL || TEST_DATABASE_URL === APP_DATABASE_URL) {
    throw new Error('Set TEST_DATABASE_URL to a disposable database, different from DATABASE_URL.');
  }
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  pool = new Pool({ connectionString: TEST_DATABASE_URL });
  await pool.query('DROP TABLE IF EXISTS salary_history, employees, currencies, users, pgmigrations CASCADE');
  execFileSync('npm', ['run', 'migrate', '--', '-d', 'TEST_DATABASE_URL'], {
    cwd: join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'inherit',
  });

  // One employee so a signed-in read returns data and the salary endpoint has a target.
  await pool.query(`INSERT INTO currencies (code, name) VALUES ('INR', 'Indian Rupee')`);
  await pool.query(
    `INSERT INTO employees (id, name, email, country, department, job_title, currency, annual_salary, joined_date)
     VALUES ('EMP-1', 'Test Person', 'emp-1@test.example', 'India', 'Engineering', 'Software Engineer', 'INR', 1000000.00, '2020-01-01')`,
  );

  // The pre-created HR demo account.
  await seedDemoUser(pool);

  app = createApp();
});

afterAll(async () => {
  process.env.DATABASE_URL = APP_DATABASE_URL;
  await closePool();
  await pool?.end();
});

describe('auth — register and login', () => {
  it('registers a new HR user', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'new.hr@demo', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('new.hr@demo');
  });

  it('logs in with the pre-created demo account', async () => {
    const res = await request(app).post('/api/auth/login').send(DEMO_HR_ACCOUNT);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(DEMO_HR_ACCOUNT.username);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: DEMO_HR_ACCOUNT.username, password: 'definitely-wrong' });
    expect(res.status).toBe(401);
  });
});

describe('auth — the APIs require a signed-in user', () => {
  it('blocks anonymous reads of employee and report data', async () => {
    expect((await request(app).get('/api/employees')).status).toBe(401);
    expect((await request(app).get('/api/employees/EMP-1')).status).toBe(401);
    expect((await request(app).get('/api/reports').query({ groupBy: 'country' })).status).toBe(401);
  });

  it('blocks an anonymous salary update', async () => {
    const res = await request(app)
      .post('/api/employees/EMP-1/salary')
      .send({ amount: '1200000', reason: 'market adjustment', previousAmount: '1000000' });
    expect(res.status).toBe(401);
  });

  it('lets a signed-in HR user read employees and reports', async () => {
    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send(DEMO_HR_ACCOUNT);
    expect(login.status).toBe(200);

    const employees = await agent.get('/api/employees');
    expect(employees.status).toBe(200);
    expect(employees.body.total).toBeGreaterThanOrEqual(1);

    const reports = await agent.get('/api/reports').query({ groupBy: 'country' });
    expect(reports.status).toBe(200);
    expect(Array.isArray(reports.body)).toBe(true);
  });
});
