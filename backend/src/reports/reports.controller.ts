import type { Request, Response } from 'express';
import { HttpError } from '../errors';
import { getReport, type GroupBy } from './reports.repository';

const GROUP_BY_VALUES: GroupBy[] = ['country', 'department', 'jobTitle'];

function isGroupBy(value: unknown): value is GroupBy {
  return typeof value === 'string' && (GROUP_BY_VALUES as string[]).includes(value);
}

// Reads a query param as a trimmed string, or undefined if empty/missing.
function str(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : undefined;
}

// GET /api/reports?groupBy=&country=&department=&jobTitle=
export async function getSalaryReport(req: Request, res: Response) {
  const groupBy = req.query.groupBy;
  if (!isGroupBy(groupBy)) {
    throw new HttpError(400, 'groupBy must be one of country, department, jobTitle');
  }

  const report = await getReport(
    {
      country: str(req.query.country),
      department: str(req.query.department),
      jobTitle: str(req.query.jobTitle),
    },
    groupBy,
  );
  res.json(report);
}
