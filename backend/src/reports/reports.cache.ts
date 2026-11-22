import type { RedisLike } from '../cache/redis';
import type { GroupBy, ReportFilters, ReportRow } from './reports.repository';

export interface ReportCacheDeps {
  // The shared Redis client, or null when caching is disabled/unavailable.
  redis: RedisLike | null;
  // Reads the current report-data version from the primary PostgreSQL database.
  getVersion: () => Promise<string>;
  // Runs the real PostgreSQL report aggregation.
  runReport: (filters: ReportFilters, groupBy: GroupBy) => Promise<ReportRow[]>;
  // App environment, used to namespace keys.
  env: string;
  ttlSeconds?: number;
}

// Cache key from the env, the data version, and the validated/normalized filters
// + grouping. Empty filters normalize to '' so equivalent requests share a key.
export function reportCacheKey(env: string, version: string, filters: ReportFilters, groupBy: GroupBy): string {
  const country = filters.country ?? '';
  const department = filters.department ?? '';
  const jobTitle = filters.jobTitle ?? '';
  return `report:${env}:v${version}:${groupBy}:${country}|${department}|${jobTitle}`;
}

function parseRows(raw: string): ReportRow[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReportRow[]) : null;
  } catch {
    return null;
  }
}

/**
 * Returns the report, using Redis when available and falling back to PostgreSQL
 * in every failure mode. PostgreSQL stays the source of truth; a change bumps the
 * version, which changes the key, so updated figures appear as soon as they're
 * fetched again.
 */
export async function getCachedReport(
  deps: ReportCacheDeps,
  filters: ReportFilters,
  groupBy: GroupBy,
): Promise<ReportRow[]> {
  const { redis, getVersion, runReport, env, ttlSeconds = 60 } = deps;

  // Caching disabled → straight to PostgreSQL.
  if (!redis) return runReport(filters, groupBy);

  // Version comes from the primary DB; if that read fails, just run the query.
  let version: string;
  try {
    version = await getVersion();
  } catch {
    return runReport(filters, groupBy);
  }

  const key = reportCacheKey(env, version, filters, groupBy);

  // Try a cache hit.
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      const rows = parseRows(cached);
      if (rows) return rows; // valid hit — skip the SQL aggregation
      // invalid cached value → fall through and recompute
    }
  } catch {
    // Redis read failed → fall back to PostgreSQL (and skip caching this time).
    return runReport(filters, groupBy);
  }

  // Miss (or invalid cached value) → compute in PostgreSQL.
  const rows = await runReport(filters, groupBy);

  // Cache only if the version hasn't moved since we captured it, so a slow
  // in-flight request can't write a stale result — and never to another key.
  try {
    const current = await getVersion();
    if (current === version) {
      await redis.set(key, JSON.stringify(rows), 'EX', ttlSeconds);
    }
  } catch {
    // A failed cache write must never fail the request.
  }

  return rows;
}
