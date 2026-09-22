import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { FeedCacheProvider, useFeedCache } from './FeedCacheContext';
import type { FeedVideo } from '../types/feed';

function makeVideo(id: string, source: 'subscription' | 'search' = 'subscription'): FeedVideo {
  return {
    videoId: id,
    title: `Video ${id}`,
    channelId: 'ch1',
    channelTitle: 'Channel 1',
    thumbnailUrl: `http://example.com/${id}.jpg`,
    publishedAt: '2024-01-01T00:00:00Z',
    source,
  };
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FeedCacheProvider>{children}</FeedCacheProvider>
);

describe('FeedCacheContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('get returns undefined for a missing entry', () => {
    const { result } = renderHook(() => useFeedCache(), { wrapper });

    expect(result.current.get('nonexistent')).toBeUndefined();
  });

  it('set then get returns cached data with videos and nextPageToken', () => {
    const { result } = renderHook(() => useFeedCache(), { wrapper });
    const videos = [makeVideo('v1'), makeVideo('v2')];

    act(() => {
      result.current.set('profile-1', undefined, videos, 'next-token');
    });

    const cached = result.current.get('profile-1');
    expect(cached).toBeDefined();
    expect(cached!.videos).toEqual(videos);
    expect(cached!.nextPageToken).toBe('next-token');
    expect(cached!.cachedAt).toBeTypeOf('number');
  });

  it('set without nextPageToken stores entry with no token', () => {
    const { result } = renderHook(() => useFeedCache(), { wrapper });
    const videos = [makeVideo('v1')];

    act(() => {
      result.current.set('profile-1', 'search', videos);
    });

    const cached = result.current.get('profile-1', 'search');
    expect(cached).toBeDefined();
    expect(cached!.videos).toEqual(videos);
    expect(cached!.nextPageToken).toBeUndefined();
  });

  it('returns undefined for expired entries after TTL (5 minutes)', () => {
    const { result } = renderHook(() => useFeedCache(), { wrapper });
    const videos = [makeVideo('v1')];

    act(() => {
      result.current.set('profile-1', undefined, videos);
    });

    expect(result.current.get('profile-1')).toBeDefined();

    // Advance past the 5-minute TTL
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    expect(result.current.get('profile-1')).toBeUndefined();
  });

  it('returns cached entry just before TTL expires', () => {
    const { result } = renderHook(() => useFeedCache(), { wrapper });
    const videos = [makeVideo('v1')];

    act(() => {
      result.current.set('profile-1', undefined, videos);
    });

    vi.advanceTimersByTime(5 * 60 * 1000 - 1);

    expect(result.current.get('profile-1')).toBeDefined();
  });

  it('invalidate with profileId removes only that profile entries', () => {
    const { result } = renderHook(() => useFeedCache(), { wrapper });

    act(() => {
      result.current.set('profile-1', undefined, [makeVideo('v1')]);
      result.current.set('profile-1', 'search', [makeVideo('v2')]);
      result.current.set('profile-2', undefined, [makeVideo('v3')]);
    });

    act(() => {
      result.current.invalidate('profile-1');
    });

    expect(result.current.get('profile-1')).toBeUndefined();
    expect(result.current.get('profile-1', 'search')).toBeUndefined();
    expect(result.current.get('profile-2')).toBeDefined();
  });

  it('invalidate without argument clears all entries', () => {
    const { result } = renderHook(() => useFeedCache(), { wrapper });

    act(() => {
      result.current.set('profile-1', undefined, [makeVideo('v1')]);
      result.current.set('profile-2', 'search', [makeVideo('v2')]);
    });

    act(() => {
      result.current.invalidate();
    });

    expect(result.current.get('profile-1')).toBeUndefined();
    expect(result.current.get('profile-2', 'search')).toBeUndefined();
  });

  it('useFeedCache outside provider throws an error', () => {
    expect(() => {
      renderHook(() => useFeedCache());
    }).toThrow('useFeedCache must be used within a FeedCacheProvider');
  });

  it('different sources create different cache keys', () => {
    const { result } = renderHook(() => useFeedCache(), { wrapper });

    act(() => {
      result.current.set('profile-1', 'search', [makeVideo('v1')]);
    });

    expect(result.current.get('profile-1', 'search')).toBeDefined();
    expect(result.current.get('profile-1', 'subscriptions')).toBeUndefined();
    expect(result.current.get('profile-1')).toBeUndefined();
  });
});
