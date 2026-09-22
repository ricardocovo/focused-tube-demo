import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { SubscriptionChannel } from '../types/youtube';

vi.mock('../services/subscriptionsApi', () => ({
  fetchSubscriptions: vi.fn(),
}));

import { fetchSubscriptions } from '../services/subscriptionsApi';
import { useSubscriptions } from './useSubscriptions';

const mockFetchSubscriptions = vi.mocked(fetchSubscriptions);

function makeSub(id: string): SubscriptionChannel {
  return {
    youtubeChannelId: id,
    channelTitle: `Channel ${id}`,
    thumbnailUrl: 'http://example.com/thumb.jpg',
    description: `Description for ${id}`,
  };
}

describe('useSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches subscriptions on mount and populates data', async () => {
    const subs = [makeSub('ch1'), makeSub('ch2')];
    mockFetchSubscriptions.mockResolvedValueOnce(subs);

    const { result } = renderHook(() => useSubscriptions());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual(subs);
    expect(result.current.error).toBeNull();
    expect(mockFetchSubscriptions).toHaveBeenCalledTimes(1);
  });

  it('sets error when fetchSubscriptions rejects', async () => {
    mockFetchSubscriptions.mockRejectedValueOnce(new Error('API failure'));

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load subscriptions.');
    expect(result.current.subscriptions).toEqual([]);
  });

  it('refetch triggers another load', async () => {
    const firstSubs = [makeSub('ch1')];
    const secondSubs = [makeSub('ch1'), makeSub('ch2')];
    mockFetchSubscriptions
      .mockResolvedValueOnce(firstSubs)
      .mockResolvedValueOnce(secondSubs);

    const { result } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.subscriptions).toEqual(firstSubs);

    await waitFor(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.subscriptions).toEqual(secondSubs);
    });

    expect(mockFetchSubscriptions).toHaveBeenCalledTimes(2);
  });

  it('only fetches once on mount due to hasFetched ref', async () => {
    const subs = [makeSub('ch1')];
    mockFetchSubscriptions.mockResolvedValue(subs);

    const { result, rerender } = renderHook(() => useSubscriptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    rerender();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchSubscriptions).toHaveBeenCalledTimes(1);
  });
});
