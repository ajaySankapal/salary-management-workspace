import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

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

/**
 * Runs a SQL query on the shared pool. Repositories use this so they don't
 * each have to reach for the pool themselves.
 */
export function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/**
 * Runs `fn` inside a transaction: BEGIN, then COMMIT if it resolves, or
 * ROLLBACK if it throws. Use for changes that must all succeed together.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Closes the shared pool. Used by scripts and tests for a clean exit. */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
