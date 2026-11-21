import 'dotenv/config';
import { getPool, closePool } from '../db/pool';
import { seedAll } from './seed';

seedAll(getPool())
  .catch((err: unknown) => {
    console.error('Seed failed:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(closePool);
