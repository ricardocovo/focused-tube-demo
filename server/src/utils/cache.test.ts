import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryCacheProvider } from './cache';

describe('InMemoryCacheProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores a value and retrieves it', async () => {
    const cache = new InMemoryCacheProvider();
    await cache.set('key1', { name: 'Alice' }, 60);
    const result = await cache.get<{ name: string }>('key1');
    expect(result).toEqual({ name: 'Alice' });
  });

  it('returns undefined for a missing key', async () => {
    const cache = new InMemoryCacheProvider();
    const result = await cache.get('nonexistent');
    expect(result).toBeUndefined();
  });

  it('returns undefined after TTL expires', async () => {
    const cache = new InMemoryCacheProvider();
    await cache.set('expiring', 'value', 10);

    const before = await cache.get('expiring');
    expect(before).toBe('value');

    vi.advanceTimersByTime(11_000);

    const after = await cache.get('expiring');
    expect(after).toBeUndefined();
  });

  it('evicts the least-recently-used entry when maxEntries is exceeded', async () => {
    const cache = new InMemoryCacheProvider(2);

    vi.setSystemTime(1000);
    await cache.set('a', 1, 300);

    vi.setSystemTime(2000);
    await cache.set('b', 2, 300);

    vi.setSystemTime(3000);
    // Access 'a' so 'b' becomes the LRU
    await cache.get('a');

    vi.setSystemTime(4000);
    // Adding a third entry should evict 'b' (oldest lastAccessedAt)
    await cache.set('c', 3, 300);

    expect(await cache.get('a')).toBe(1);
    expect(await cache.get('b')).toBeUndefined();
    expect(await cache.get('c')).toBe(3);
  });

  it('clear() empties all entries', async () => {
    const cache = new InMemoryCacheProvider();
    await cache.set('x', 1, 60);
    await cache.set('y', 2, 60);

    await cache.clear();

    expect(await cache.get('x')).toBeUndefined();
    expect(await cache.get('y')).toBeUndefined();
  });

  it('delete() removes a single entry', async () => {
    const cache = new InMemoryCacheProvider();
    await cache.set('a', 1, 60);
    await cache.set('b', 2, 60);

    await cache.delete('a');

    expect(await cache.get('a')).toBeUndefined();
    expect(await cache.get('b')).toBe(2);
  });

  it('sweep removes expired entries on timer', async () => {
    const cache = new InMemoryCacheProvider();
    await cache.set('short', 'val', 5);
    await cache.set('long', 'val', 120);

    // Advance past the short TTL and past the 60s sweep interval
    vi.advanceTimersByTime(61_000);

    expect(await cache.get('short')).toBeUndefined();
    expect(await cache.get('long')).toBe('val');
  });
});
