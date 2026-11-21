import 'dotenv/config';
import { Pool } from 'pg';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { CURRENCIES } from '../data/currencies';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

let pool: Pool;

// A valid employee; each test overrides one field.
const baseEmployee = {
  id: 'EMP-0001',
  name: 'Asha Rao',
  country: 'India',
  department: 'Engineering',
  jobTitle: 'Software Engineer',
  currency: 'INR',
  annualSalary: '500000.00',
};

function insertEmployee(overrides: Partial<typeof baseEmployee> = {}) {
  const e = { ...baseEmployee, ...overrides };
  return pool.query(
    `INSERT INTO employees (id, name, country, department, job_title, currency, annual_salary)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [e.id, e.name, e.country, e.department, e.jobTitle, e.currency, e.annualSalary],
  );
}

beforeAll(async () => {
  if (!TEST_DATABASE_URL || TEST_DATABASE_URL === process.env.DATABASE_URL) {
    throw new Error('Set TEST_DATABASE_URL to a disposable database, different from DATABASE_URL.');
  }

  // Run the real migration against the test database — the same `npm run migrate`
  // developers use, pointed at TEST_DATABASE_URL via -d. Letting npm resolve the
  // binary avoids hardcoding node_modules paths.
  execFileSync('npm', ['run', 'migrate', '--', '-d', 'TEST_DATABASE_URL'], {
    cwd: join(__dirname, '..', '..'),
    env: process.env,
    stdio: 'inherit',
  });

  pool = new Pool({ connectionString: TEST_DATABASE_URL });
  for (const { code, name } of CURRENCIES) {
    await pool.query('INSERT INTO currencies (code, name) VALUES ($1, $2) ON CONFLICT DO NOTHING', [code, name]);
  }
});

afterEach(() => pool.query('DELETE FROM employees'));
afterAll(() => pool?.end());

describe('employees schema', () => {
  it('saves a decimal salary and reads it back unchanged (720000.50 INR)', async () => {
    await insertEmployee({ annualSalary: '720000.50' });
    const { rows } = await pool.query(
      'SELECT currency, annual_salary FROM employees WHERE id = $1',
      [baseEmployee.id],
    );
    // pg returns NUMERIC as a string, so the exact decimal is preserved.
    expect(rows[0]).toEqual({ currency: 'INR', annual_salary: '720000.50' });
  });

  it('rejects a duplicate employee id', async () => {
    await insertEmployee();
    await expect(insertEmployee()).rejects.toMatchObject({ code: '23505' }); // unique_violation
  });

  it('rejects a zero or negative salary', async () => {
    await expect(insertEmployee({ annualSalary: '0' })).rejects.toMatchObject({ code: '23514' }); // check_violation
    await expect(insertEmployee({ annualSalary: '-1' })).rejects.toMatchObject({ code: '23514' });
  });

  it('rejects an unsupported currency', async () => {
    await expect(insertEmployee({ currency: 'JPY' })).rejects.toMatchObject({ code: '23503' }); // foreign_key_violation
  });

  it('rejects a blank employee name', async () => {
    await expect(insertEmployee({ name: '   ' })).rejects.toMatchObject({ code: '23514' });
  });
});

describe('currencies schema', () => {
  it('rejects a badly formatted code', async () => {
    await expect(pool.query(`INSERT INTO currencies VALUES ('usd', 'lower')`)).rejects.toMatchObject({ code: '23514' });
  });

  it('rejects a blank currency name', async () => {
    await expect(pool.query(`INSERT INTO currencies VALUES ('AAA', '   ')`)).rejects.toMatchObject({ code: '23514' });
  });
});
