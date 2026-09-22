export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
}

export class InMemoryCacheProvider implements CacheProvider {
  private store = new Map<string, CacheEntry>();
  private maxEntries: number;
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor(maxEntries: number = 5000) {
    this.maxEntries = maxEntries;
    this.cleanupTimer = setInterval(() => this.sweep(), 60_000);
    this.cleanupTimer.unref();
  }

  async get<T>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);

    if (!entry) {
      console.debug(`[cache] MISS key="${key}"`);
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      console.debug(`[cache] MISS key="${key}" (expired)`);
      return undefined;
    }

    entry.lastAccessedAt = Date.now();
    console.debug(`[cache] HIT key="${key}"`);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.store.size >= this.maxEntries && !this.store.has(key)) {
      this.evictLru();
    }

    const now = Date.now();
    this.store.set(key, {
      value,
      expiresAt: now + ttlSeconds * 1000,
      lastAccessedAt: now,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  private evictLru(): void {
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessedAt < oldestAccess) {
        oldestAccess = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== undefined) {
      this.store.delete(oldestKey);
      console.debug(`[cache] EVICT key="${oldestKey}"`);
    }
  }

  private sweep(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.debug(`[cache] SWEEP removed ${removed} expired entries`);
    }
  }
}

const maxEntries = parseInt(process.env.CACHE_MAX_ENTRIES ?? '5000', 10) || 5000;
export const cache: CacheProvider = new InMemoryCacheProvider(maxEntries);
