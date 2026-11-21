import type { Pool } from 'pg';
import { CURRENCIES } from '../data/currencies';
import { generateEmployees } from './employees';

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
    `INSERT INTO employees (id, name, country, department, job_title, currency, annual_salary)
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::numeric[]
     )
     ON CONFLICT (id) DO NOTHING`,
    [
      employees.map((e) => e.id),
      employees.map((e) => e.name),
      employees.map((e) => e.country),
      employees.map((e) => e.department),
      employees.map((e) => e.jobTitle),
      employees.map((e) => e.currency),
      employees.map((e) => e.annualSalary),
    ],
  );

  return employees.length;
}

export async function seedAll(pool: Pool): Promise<void> {
  await seedCurrencies(pool);
  const count = await seedEmployees(pool);
  console.log(`Seeded currencies and ${count} employees.`);
}
