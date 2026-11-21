import 'dotenv/config';
import { getPool, closePool } from '../db/pool';
import { CURRENCIES } from '../data/currencies';

// Loads reference data into the currencies table from the app's currency list.
// Idempotent: re-running updates names and leaves existing rows in place.
async function seedCurrencies() {
  const db = getPool();
  for (const { code, name } of CURRENCIES) {
    await db.query(
      `INSERT INTO currencies (code, name) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
      [code, name],
    );
  }
  console.log(`Seeded ${CURRENCIES.length} currencies.`);
}

async function seed() {
  await seedCurrencies();
  // Employees (10,000 fictional, repeatable) are added here in the seed step.
}

seed()
  .catch((err: unknown) => {
    console.error('Seed failed:', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(closePool);
