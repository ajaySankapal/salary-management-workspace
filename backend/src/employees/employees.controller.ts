import type { Request, Response } from 'express';
import { HttpError } from '../errors';
import { getFilterOptions, listEmployees } from './employees.repository';

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

// GET /api/employees?page=&search=&country=&department=&jobTitle=
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
  });
  res.json(result);
}

// GET /api/employees/filters
export async function getFilters(_req: Request, res: Response) {
  const options = await getFilterOptions();
  res.json(options);
}
