import type { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { CURRENCIES } from '../data/currencies';
import { DEMO_HR_ACCOUNT } from '../auth/demoAccount';
import { generateEmployees } from './employees';

// The pre-created HR login. Idempotent: ON CONFLICT DO NOTHING keeps an existing
// account (and its password) untouched on a re-run.
export async function seedDemoUser(pool: Pool): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_HR_ACCOUNT.password, 10);
  await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
    [DEMO_HR_ACCOUNT.username, passwordHash],
  );
}

// Reference data: the valid currencies. Idempotent.
export async function seedCurrencies(pool: Pool): Promise<void> {
  for (const { code, name } of CURRENCIES) {
    await pool.query(
      'INSERT INTO currencies (code, name) VALUES ($1, $2) ON CONFLICT (code) DO NOTHING',
      [code, name],
    );
  }
}

// Inserts the fictional employees. ON CONFLICT DO NOTHING means existing rows
// are never overwritten, so an employee's edited salary survives a re-run.
export async function seedEmployees(pool: Pool): Promise<number> {
  const employees = generateEmployees();

  await pool.query(
    `INSERT INTO employees (id, name, email, country, department, job_title, currency, annual_salary, joined_date)
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::numeric[], $9::date[]
     )
     ON CONFLICT (id) DO NOTHING`,
    [
      employees.map((e) => e.id),
      employees.map((e) => e.name),
      employees.map((e) => e.email),
      employees.map((e) => e.country),
      employees.map((e) => e.department),
      employees.map((e) => e.jobTitle),
      employees.map((e) => e.currency),
      employees.map((e) => e.annualSalary),
      employees.map((e) => e.joinedDate),
    ],
  );

  return employees.length;
}

export async function seedAll(pool: Pool): Promise<void> {
  await seedCurrencies(pool);
  await seedDemoUser(pool);
  const count = await seedEmployees(pool);
  console.log(`Seeded currencies, the demo HR user, and ${count} employees.`);
}
