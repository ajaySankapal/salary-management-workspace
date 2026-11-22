import type { Request, Response } from 'express';
import { HttpError } from '../errors';
import {
  EMPLOYEE_SORT_KEYS,
  getEmployeeById,
  getFilterOptions,
  getSalaryHistory,
  listEmployees,
  updateSalary,
  type EmployeeSortKey,
} from './employees.repository';

// A valid salary amount: a positive number within the DB's numeric(12,2) range.
function isValidAmount(raw: unknown): raw is string | number {
  const value = Number(raw);
  return (typeof raw === 'string' || typeof raw === 'number') && Number.isFinite(value) && value >= 0.01 && value <= 9999999999.99;
}

// Parses the ?page param: defaults to 1 when absent, or null if it is not a
// positive whole number.
function parsePage(raw: unknown): number | null {
  if (raw === undefined) return 1;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : null;
}

// Reads a query param as a trimmed string, or undefined if it's empty/missing.
function str(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}

// A valid sort column (from the whitelist), or undefined to fall back to the default.
function parseSort(raw: unknown): EmployeeSortKey | undefined {
  return typeof raw === 'string' && (EMPLOYEE_SORT_KEYS as string[]).includes(raw)
    ? (raw as EmployeeSortKey)
    : undefined;
}

// GET /api/employees?page=&search=&country=&department=&jobTitle=&sort=&dir=
export async function getEmployees(req: Request, res: Response) {
  const page = parsePage(req.query.page);
  if (page === null) {
    throw new HttpError(400, 'page must be a positive whole number');
  }

  const result = await listEmployees({
    page,
    search: str(req.query.search),
    country: str(req.query.country),
    department: str(req.query.department),
    jobTitle: str(req.query.jobTitle),
    sort: parseSort(req.query.sort),
    dir: req.query.dir === 'desc' ? 'desc' : req.query.dir === 'asc' ? 'asc' : undefined,
  });
  res.json(result);
}

// GET /api/employees/filters
export async function getFilters(_req: Request, res: Response) {
  const options = await getFilterOptions();
  res.json(options);
}

// GET /api/employees/:id — employee plus their salary-change history.
export async function getEmployee(req: Request, res: Response) {
  const employee = await getEmployeeById(req.params.id);
  if (!employee) {
    throw new HttpError(404, 'Employee not found');
  }
  const history = await getSalaryHistory(req.params.id);
  res.json({ ...employee, history });
}

// POST /api/employees/:id/salary  { amount, reason, previousAmount }
export async function updateEmployeeSalary(req: Request, res: Response) {
  const { amount, reason, previousAmount } = req.body ?? {};

  if (!isValidAmount(amount)) {
    throw new HttpError(400, 'amount must be a positive number');
  }
  if (typeof reason !== 'string' || reason.trim() === '') {
    throw new HttpError(400, 'reason is required');
  }
  if (!isValidAmount(previousAmount)) {
    throw new HttpError(400, 'previousAmount must be a number');
  }

  const result = await updateSalary(req.params.id, {
    amount: String(amount),
    reason: reason.trim(),
    previousAmount: String(previousAmount),
  });

  if (!result.ok) {
    if (result.reason === 'not_found') {
      throw new HttpError(404, 'Employee not found');
    }
    throw new HttpError(409, 'This record was changed by someone else. Reload and try again.');
  }

  res.json(result.employee);
}
