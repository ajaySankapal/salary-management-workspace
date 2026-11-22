import type { Request, Response } from 'express';
import { HttpError } from '../errors';
import { getRedisClient } from '../cache/redis';
import { getReport, type GroupBy } from './reports.repository';
import { getReportVersion } from './reportVersion';
import { getCachedReport } from './reports.cache';

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

  const filters = {
    country: str(req.query.country),
    department: str(req.query.department),
    jobTitle: str(req.query.jobTitle),
  };

  // Serve from Redis when available, keyed by the current report-data version;
  // falls back to the PostgreSQL aggregation in every Redis failure mode.
  const report = await getCachedReport(
    {
      redis: getRedisClient(),
      getVersion: getReportVersion,
      runReport: getReport,
      env: process.env.NODE_ENV ?? 'development',
    },
    filters,
    groupBy,
  );
  res.json(report);
}
