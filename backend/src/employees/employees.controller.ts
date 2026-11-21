import type { Request, Response } from 'express';
import { HttpError } from '../errors';
import { listEmployees } from './employees.repository';

// Parses the ?page param: defaults to 1 when absent, or null if it is not a
// positive whole number.
function parsePage(raw: unknown): number | null {
  if (raw === undefined) return 1;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : null;
}

// GET /api/employees?page=
export async function getEmployees(req: Request, res: Response) {
  const page = parsePage(req.query.page);
  if (page === null) {
    throw new HttpError(400, 'page must be a positive whole number');
  }
  const result = await listEmployees(page);
  res.json(result);
}
