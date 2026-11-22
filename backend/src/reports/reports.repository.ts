import { query } from '../db/pool';

export type GroupBy = 'country' | 'department' | 'jobTitle';

// Whitelist of group-by fields → DB column (group-by columns can't be parameterized).
const GROUP_COLUMNS: Record<GroupBy, string> = {
  country: 'country',
  department: 'department',
  jobTitle: 'job_title',
};

export interface ReportFilters {
  country?: string;
  department?: string;
  jobTitle?: string;
}

export interface ReportRow {
  group: string;
  currency: string;
  count: number;
  median: string; // decimal string
  average: string; // decimal string
  total: string; // decimal string — sum of annual base pay in the group
}

function buildWhere(filters: ReportFilters): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

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

// Count, median, and average of the current salary for each group + currency.
// median uses percentile_cont (even counts average the two middle values).
export async function getReport(filters: ReportFilters, groupBy: GroupBy): Promise<ReportRow[]> {
  const column = GROUP_COLUMNS[groupBy];
  const { where, params } = buildWhere(filters);

  const result = await query<ReportRow>(
    `SELECT ${column} AS "group", currency,
            count(*)::int AS count,
            round(percentile_cont(0.5) WITHIN GROUP (ORDER BY annual_salary)::numeric, 2) AS median,
            round(avg(annual_salary), 2) AS average,
            round(sum(annual_salary), 2) AS total
     FROM employees
     ${where}
     GROUP BY ${column}, currency
     ORDER BY ${column}, currency`,
    params,
  );

  return result.rows;
}
