import { getCachedReport } from './reports.cache';
import type { RedisLike } from '../cache/redis';
import type { GroupBy, ReportFilters, ReportRow } from './reports.repository';

const ROWS_A: ReportRow[] = [
  { group: 'India', currency: 'INR', count: 2, median: '100.00', average: '100.00', total: '200.00' },
];
const ROWS_B: ReportRow[] = [
  { group: 'Germany', currency: 'EUR', count: 1, median: '90.00', average: '90.00', total: '90.00' },
];

// A tiny in-memory Redis that records calls.
class FakeRedis implements RedisLike {
  store = new Map<string, string>();
  getCalls = 0;
  setCalls = 0;
  async get(key: string) {
    this.getCalls += 1;
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.setCalls += 1;
    this.store.set(key, value);
    return 'OK';
  }
}

const filters: ReportFilters = { country: 'India' };
const groupBy: GroupBy = 'country';

describe('getCachedReport', () => {
  it('runs the SQL aggregation when Redis is not configured', async () => {
    const runReport = jest.fn(async () => ROWS_A);
    const result = await getCachedReport({ redis: null, getVersion: async () => '1', runReport, env: 'test' }, filters, groupBy);

    expect(result).toEqual(ROWS_A);
    expect(runReport).toHaveBeenCalledTimes(1);
  });

  it('first request runs the SQL, repeating it uses the cache (no SQL)', async () => {
    const redis = new FakeRedis();
    const runReport = jest.fn(async () => ROWS_A);
    const deps = { redis, getVersion: async () => '1', runReport, env: 'test' };

    const first = await getCachedReport(deps, filters, groupBy);
    const second = await getCachedReport(deps, filters, groupBy);

    expect(first).toEqual(ROWS_A);
    expect(second).toEqual(ROWS_A);
    expect(runReport).toHaveBeenCalledTimes(1); // the aggregation ran only once
    expect(redis.setCalls).toBe(1);
  });

  it('uses different cache entries for different filters or grouping', async () => {
    const redis = new FakeRedis();
    const runReport = jest.fn(async (_f: ReportFilters, g: GroupBy) => (g === 'country' ? ROWS_A : ROWS_B));
    const deps = { redis, getVersion: async () => '1', runReport, env: 'test' };

    await getCachedReport(deps, { country: 'India' }, 'country');
    await getCachedReport(deps, { department: 'Engineering' }, 'department');

    expect(runReport).toHaveBeenCalledTimes(2);
    expect(redis.store.size).toBe(2);

    // Each repeats from its own cache entry.
    await getCachedReport(deps, { country: 'India' }, 'country');
    await getCachedReport(deps, { department: 'Engineering' }, 'department');
    expect(runReport).toHaveBeenCalledTimes(2);
  });

  it('recomputes after the data version changes (version-keyed invalidation)', async () => {
    const redis = new FakeRedis();
    let version = '1';
    const runReport = jest.fn(async () => ROWS_A);
    const deps = { redis, getVersion: async () => version, runReport, env: 'test' };

    await getCachedReport(deps, filters, groupBy); // caches under v1
    await getCachedReport(deps, filters, groupBy); // hit v1
    expect(runReport).toHaveBeenCalledTimes(1);

    version = '2'; // a committed change bumped the version
    await getCachedReport(deps, filters, groupBy); // v2 key → miss → recompute
    expect(runReport).toHaveBeenCalledTimes(2);
  });

  it('does not write to the cache if the version changed during computation', async () => {
    const redis = new FakeRedis();
    const versions = ['1', '2']; // key built with v1, post-compute check sees v2
    let i = 0;
    const getVersion = jest.fn(async () => versions[Math.min(i++, versions.length - 1)]);
    const runReport = jest.fn(async () => ROWS_A);

    const result = await getCachedReport({ redis, getVersion, runReport, env: 'test' }, filters, groupBy);

    expect(result).toEqual(ROWS_A);
    expect(redis.setCalls).toBe(0);
  });

  it('falls back to PostgreSQL when a Redis read fails', async () => {
    const redis: RedisLike = {
      get: async () => {
        throw new Error('redis down');
      },
      set: async () => 'OK',
    };
    const runReport = jest.fn(async () => ROWS_A);

    const result = await getCachedReport({ redis, getVersion: async () => '1', runReport, env: 'test' }, filters, groupBy);

    expect(result).toEqual(ROWS_A);
    expect(runReport).toHaveBeenCalledTimes(1);
  });

  it('still returns the report when a Redis write fails', async () => {
    const redis: RedisLike = {
      get: async () => null, // miss
      set: async () => {
        throw new Error('write failed');
      },
    };
    const runReport = jest.fn(async () => ROWS_A);

    const result = await getCachedReport({ redis, getVersion: async () => '1', runReport, env: 'test' }, filters, groupBy);

    expect(result).toEqual(ROWS_A);
    expect(runReport).toHaveBeenCalledTimes(1);
  });

  it('ignores an invalid cached value and recomputes', async () => {
    const redis = new FakeRedis();
    const runReport = jest.fn(async () => ROWS_A);
    const deps = { redis, getVersion: async () => '1', runReport, env: 'test' };
    // Pre-seed the exact key with a non-JSON value.
    redis.store.set('report:test:v1:country:India||', 'not json');

    const result = await getCachedReport(deps, filters, groupBy);
    expect(result).toEqual(ROWS_A);
    expect(runReport).toHaveBeenCalledTimes(1);
  });
});
