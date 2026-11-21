import 'dotenv/config';
import { Pool } from 'pg';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { seedAll } from '../seed/seed';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

let pool: Pool;

async function employeeCount(): Promise<number> {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM employees');
  return rows[0].n;
}

beforeAll(async () => {
  if (!TEST_DATABASE_URL || TEST_DATABASE_URL === process.env.DATABASE_URL) {
    throw new Error('Set TEST_DATABASE_URL to a disposable database, different from DATABASE_URL.');
  }

  pool = new Pool({ connectionString: TEST_DATABASE_URL });

  // Start from a clean database, then run the real migrations.
  await pool.query('DROP TABLE IF EXISTS salary_history, employees, currencies, pgmigrations CASCADE');
  execFileSync('npm', ['run', 'migrate', '--', '-d', 'TEST_DATABASE_URL'], {
    cwd: join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'inherit',
  });

  // Seed the fresh database once.
  await seedAll(pool);
});

afterAll(() => pool?.end());

it('seeds exactly 10,000 employees on a fresh database', async () => {
  expect(await employeeCount()).toBe(10000);
});

it('preserves an edited salary when the seed is re-run', async () => {
  await pool.query(`UPDATE employees SET annual_salary = 999999.99 WHERE id = 'EMP-00001'`);

  await seedAll(pool); // re-run

  const { rows } = await pool.query(`SELECT annual_salary FROM employees WHERE id = 'EMP-00001'`);
  expect(rows[0].annual_salary).toBe('999999.99'); // edit kept, not reset
  expect(await employeeCount()).toBe(10000); // still exactly 10,000
});
