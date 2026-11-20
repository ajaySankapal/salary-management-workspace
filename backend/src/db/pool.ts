import { Pool } from 'pg';

// One shared connection pool for the whole backend.
let pool: Pool | undefined;

/**
 * Returns the shared pg Pool, creating it on first use.
 * Throws a clear error if DATABASE_URL is not set.
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL is not set. Copy .env.example to .env and set a local ' +
          'PostgreSQL connection string before starting the server.',
      );
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

/** Closes the shared pool. Used by scripts and tests for a clean exit. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
