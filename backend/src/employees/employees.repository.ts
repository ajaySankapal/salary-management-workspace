import { query, withTransaction } from '../db/pool';

const PAGE_SIZE = 10;

export interface Employee {
  id: string;
  name: string;
  email: string;
  country: string;
  department: string;
  jobTitle: string;
  salary: string; // decimal string (NUMERIC from the DB)
  currency: string;
  joinedDate: string; // YYYY-MM-DD
}

// The columns that make up an Employee, shared by the list and details queries.
const EMPLOYEE_COLUMNS = `
  id, name, email, country, department, job_title AS "jobTitle",
  annual_salary AS salary, currency, to_char(joined_date, 'YYYY-MM-DD') AS "joinedDate"
`;

export interface EmployeeFilters {
  page: number;
  search?: string;
  country?: string;
  department?: string;
  jobTitle?: string;
}

export interface FilterOptions {
  countries: string[];
  departments: string[];
  jobTitles: string[];
}

// Builds the shared WHERE clause and its parameters from the filters. Search is
// case-insensitive (ILIKE) over name or id; the rest are exact matches. Search
// and filters apply to the whole table, before pagination.
function buildWhere(filters: EmployeeFilters): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(name ILIKE $${params.length} OR id ILIKE $${params.length})`);
  }
  if (filters.country) {
    params.push(filters.country);
    conditions.push(`country = $${params.length}`);
  }
  if (filters.department) {
    params.push(filters.department);
    conditions.push(`department = $${params.length}`);
  }
  if (filters.jobTitle) {
    params.push(filters.jobTitle);
    conditions.push(`job_title = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

// Returns one page of matching employees (sorted by name, then id) and the total
// number of matches across all pages. Pagination is done in PostgreSQL.
export async function listEmployees(filters: EmployeeFilters) {
  const { where, params } = buildWhere(filters);
  const offset = (filters.page - 1) * PAGE_SIZE;

  const list = await query<Employee>(
    `SELECT ${EMPLOYEE_COLUMNS}
     FROM employees
     ${where}
     ORDER BY name, id
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, PAGE_SIZE, offset],
  );
  const count = await query<{ total: number }>(
    `SELECT count(*)::int AS total FROM employees ${where}`,
    params,
  );

  return {
    rows: list.rows,
    page: filters.page,
    pageSize: PAGE_SIZE,
    total: count.rows[0].total,
  };
}

// Returns a single employee, or null if the id does not exist.
export async function getEmployeeById(id: string): Promise<Employee | null> {
  const result = await query<Employee>(`SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export interface SalaryHistoryEntry {
  id: number;
  previousAmount: string | null;
  newAmount: string;
  reason: string;
  changedAt: string; // YYYY-MM-DD
}

// Salary change history for an employee, newest first.
export async function getSalaryHistory(id: string): Promise<SalaryHistoryEntry[]> {
  const result = await query<SalaryHistoryEntry>(
    `SELECT id, previous_amount AS "previousAmount", new_amount AS "newAmount", reason,
            to_char(changed_at, 'YYYY-MM-DD') AS "changedAt"
     FROM salary_history
     WHERE employee_id = $1
     ORDER BY changed_at DESC, id DESC`,
    [id],
  );
  return result.rows;
}

export interface SalaryUpdate {
  amount: string; // new salary, decimal string
  reason: string;
  previousAmount: string; // the salary the client last saw (optimistic check)
}

export type SalaryUpdateResult =
  | { ok: true; employee: Employee }
  | { ok: false; reason: 'not_found' | 'stale' };

// Updates the current salary and records a history entry in one transaction.
// Rejects (without any change) if the employee is gone, or if its current
// salary no longer matches previousAmount (someone else changed it first).
export async function updateSalary(id: string, input: SalaryUpdate): Promise<SalaryUpdateResult> {
  return withTransaction(async (client) => {
    // Lock the row so a concurrent update can't slip in between check and write.
    const current = await client.query<{ annual_salary: string }>(
      'SELECT annual_salary FROM employees WHERE id = $1 FOR UPDATE',
      [id],
    );
    if (current.rowCount === 0) {
      return { ok: false, reason: 'not_found' };
    }
    const dbAmount = current.rows[0].annual_salary;
    if (Number(dbAmount) !== Number(input.previousAmount)) {
      return { ok: false, reason: 'stale' };
    }

    await client.query('UPDATE employees SET annual_salary = $1 WHERE id = $2', [input.amount, id]);
    await client.query(
      `INSERT INTO salary_history (employee_id, previous_amount, new_amount, reason)
       VALUES ($1, $2, $3, $4)`,
      [id, dbAmount, input.amount, input.reason],
    );

    const updated = await client.query<Employee>(`SELECT ${EMPLOYEE_COLUMNS} FROM employees WHERE id = $1`, [id]);
    return { ok: true, employee: updated.rows[0] };
  });
}

// Distinct values for the filter dropdowns.
export async function getFilterOptions(): Promise<FilterOptions> {
  const countries = await query<{ value: string }>('SELECT DISTINCT country AS value FROM employees ORDER BY country');
  const departments = await query<{ value: string }>('SELECT DISTINCT department AS value FROM employees ORDER BY department');
  const jobTitles = await query<{ value: string }>('SELECT DISTINCT job_title AS value FROM employees ORDER BY job_title');

  return {
    countries: countries.rows.map((r) => r.value),
    departments: departments.rows.map((r) => r.value),
    jobTitles: jobTitles.rows.map((r) => r.value),
  };
}
