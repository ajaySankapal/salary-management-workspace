import 'dotenv/config';
import { getPool, closePool } from './pool';

// Verifies database connectivity by running a trivial query.
async function main() {
  const pool = getPool();
  const { rows } = await pool.query('SELECT 1 AS result');
  console.log('Database connection OK. SELECT 1 =>', rows[0].result);
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Database check failed:', message);
    process.exitCode = 1;
  })
  .finally(closePool);
