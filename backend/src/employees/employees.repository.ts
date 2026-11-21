import { query } from '../db/pool';

const PAGE_SIZE = 25;

export interface Employee {
  id: string;
  name: string;
  country: string;
  jobTitle: string;
  salary: string; // decimal string (NUMERIC from the DB)
  currency: string;
}

// Returns one page of employees (sorted by name, then id) and the total count.
// The SQL aliases give the columns their API names, and pagination is done in
// PostgreSQL with LIMIT/OFFSET.
export async function listEmployees(page: number) {
  const offset = (page - 1) * PAGE_SIZE;

  const list = await query<Employee>(
    `SELECT id, name, country, job_title AS "jobTitle", annual_salary AS salary, currency
     FROM employees
     ORDER BY name, id
     LIMIT $1 OFFSET $2`,
    [PAGE_SIZE, offset],
  );
  const count = await query<{ total: number }>('SELECT count(*)::int AS total FROM employees');

  return {
    rows: list.rows,
    page,
    pageSize: PAGE_SIZE,
    total: count.rows[0].total,
  };
}
