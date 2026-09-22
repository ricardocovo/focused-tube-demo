import { config } from './config';

/**
 * Known YouTube API quota costs per endpoint.
 */
export const QUOTA_COSTS = {
  'search.list': 100,
  'playlistItems.list': 1,
  'channels.list': 1,
  'subscriptions.list': 1,
  'videos.list': 1,
} as const;

export type QuotaEndpoint = keyof typeof QUOTA_COSTS;

interface DailyCounter {
  date: string; // YYYY-MM-DD
  used: number;
}

class QuotaTracker {
  private counter: DailyCounter;

  constructor() {
    this.counter = { date: this.todayKey(), used: 0 };
  }

  private todayKey(): string {
    // YouTube quota resets at midnight Pacific Time
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  }

  private ensureCurrentDay(): void {
    const today = this.todayKey();
    if (this.counter.date !== today) {
      console.debug(`[QuotaTracker] Day rolled over from ${this.counter.date} to ${today}, resetting counter`);
      this.counter = { date: today, used: 0 };
    }
  }

  /**
   * Record quota usage for an API call.
   */
  record(endpoint: QuotaEndpoint, calls: number = 1): void {
    this.ensureCurrentDay();
    const cost = QUOTA_COSTS[endpoint] * calls;
    this.counter.used += cost;
    console.debug(`[QuotaTracker] ${endpoint} x${calls} = ${cost} units (total: ${this.counter.used}/${config.QUOTA_DAILY_LIMIT})`);
  }

  /**
   * Check if making the given call(s) would exceed the daily limit.
   */
  wouldExceed(endpoint: QuotaEndpoint, calls: number = 1): boolean {
    this.ensureCurrentDay();
    const cost = QUOTA_COSTS[endpoint] * calls;
    return (this.counter.used + cost) > config.QUOTA_DAILY_LIMIT;
  }

  /**
   * Get current usage stats.
   */
  getUsage(): { date: string; used: number; limit: number; remaining: number } {
    this.ensureCurrentDay();
    return {
      date: this.counter.date,
      used: this.counter.used,
      limit: config.QUOTA_DAILY_LIMIT,
      remaining: Math.max(0, config.QUOTA_DAILY_LIMIT - this.counter.used),
    };
  }
}

export const quotaTracker = new QuotaTracker();
