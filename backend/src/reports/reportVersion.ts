import type { PoolClient } from 'pg';
import { query } from '../db/pool';

// The current report-data version from the primary PostgreSQL database.
// Returned as a string (bigint) so it can go straight into a cache key.
export async function getReportVersion(): Promise<string> {
  const { rows } = await query<{ version: string }>('SELECT version FROM report_data_version WHERE id = true');
  return rows[0]?.version ?? '0';
}

// Bumps the version. MUST be called inside the same transaction as the change that
// affects reports, so a rollback leaves the version untouched.
export async function bumpReportVersion(client: PoolClient): Promise<void> {
  await client.query('UPDATE report_data_version SET version = version + 1 WHERE id = true');
}
