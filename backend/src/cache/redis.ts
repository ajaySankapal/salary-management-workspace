import Redis from 'ioredis';

// The small slice of the Redis client the report cache uses. Keeping it narrow
// makes the cache logic easy to unit-test with a fake.
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
}

let client: RedisLike | null | undefined;

/**
 * One shared Redis client, created on first use.
 * - Returns null when REDIS_URL is not set (caching disabled → PostgreSQL only).
 * - Bounded connect/command timeouts and no offline queue, so a missing, slow, or
 *   unreachable Redis fails fast and the caller falls back to PostgreSQL instead
 *   of hanging. Connection errors are swallowed (they'd otherwise crash the app).
 */
export function getRedisClient(): RedisLike | null {
  if (client !== undefined) return client;

  const url = process.env.REDIS_URL;
  if (!url) {
    client = null;
    return client;
  }

  const redis = new Redis(url, {
    connectTimeout: 1000,
    commandTimeout: 1000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });
  redis.on('error', () => {
    // Swallow — callers catch failures and fall back to PostgreSQL.
  });

  client = redis;
  return client;
}

// Closes the shared client (for scripts/tests). Safe to call when none exists.
export async function closeRedis(): Promise<void> {
  if (client && 'quit' in client) {
    await (client as Redis).quit().catch(() => {});
  }
  client = undefined;
}
