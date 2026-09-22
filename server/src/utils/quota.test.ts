import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./config', () => ({
  config: {
    QUOTA_DAILY_LIMIT: 10_000,
  },
}));

describe('QuotaTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00-08:00')); // noon Pacific
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getQuotaModule() {
    return await import('./quota');
  }

  it('record() increments usage by correct cost for search.list', async () => {
    const { quotaTracker } = await getQuotaModule();
    quotaTracker.record('search.list');
    expect(quotaTracker.getUsage().used).toBe(100);
  });

  it('record() with multiple calls multiplies correctly', async () => {
    const { quotaTracker } = await getQuotaModule();
    quotaTracker.record('search.list', 3);
    expect(quotaTracker.getUsage().used).toBe(300);
  });

  it('record() tracks low-cost endpoints correctly', async () => {
    const { quotaTracker } = await getQuotaModule();
    quotaTracker.record('channels.list', 5);
    expect(quotaTracker.getUsage().used).toBe(5);
  });

  it('wouldExceed() returns false when under limit', async () => {
    const { quotaTracker } = await getQuotaModule();
    expect(quotaTracker.wouldExceed('search.list')).toBe(false);
  });

  it('wouldExceed() returns true when would go over limit', async () => {
    const { quotaTracker } = await getQuotaModule();
    quotaTracker.record('search.list', 99); // 9900 used
    expect(quotaTracker.wouldExceed('search.list', 2)).toBe(true); // 9900 + 200 > 10000
  });

  it('wouldExceed() returns false when exactly at limit', async () => {
    const { quotaTracker } = await getQuotaModule();
    quotaTracker.record('search.list', 99); // 9900 used
    expect(quotaTracker.wouldExceed('search.list', 1)).toBe(false); // 9900 + 100 = 10000, not > 10000
  });

  it('getUsage() returns correct date, used, limit, remaining', async () => {
    const { quotaTracker } = await getQuotaModule();
    quotaTracker.record('subscriptions.list', 10);

    const usage = quotaTracker.getUsage();
    expect(usage.used).toBe(10);
    expect(usage.limit).toBe(10_000);
    expect(usage.remaining).toBe(9_990);
    expect(usage.date).toBe('2025-01-15');
  });

  it('resets usage on day boundary rollover', async () => {
    const { quotaTracker } = await getQuotaModule();

    quotaTracker.record('search.list', 50); // 5000 used
    expect(quotaTracker.getUsage().used).toBe(5000);

    // Advance to next day (Pacific Time)
    vi.setSystemTime(new Date('2025-01-16T12:00:00-08:00'));

    const usage = quotaTracker.getUsage();
    expect(usage.used).toBe(0);
    expect(usage.date).toBe('2025-01-16');
    expect(usage.remaining).toBe(10_000);
  });

  it('QUOTA_COSTS exports correct values', async () => {
    const { QUOTA_COSTS } = await getQuotaModule();
    expect(QUOTA_COSTS['search.list']).toBe(100);
    expect(QUOTA_COSTS['playlistItems.list']).toBe(1);
    expect(QUOTA_COSTS['channels.list']).toBe(1);
    expect(QUOTA_COSTS['subscriptions.list']).toBe(1);
  });
});
