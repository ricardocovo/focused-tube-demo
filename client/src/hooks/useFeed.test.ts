import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { FeedVideo } from '../types/feed';

vi.mock('../services/feedApi', () => ({
  fetchFeed: vi.fn(),
}));

const mockFeedCache = {
  get: vi.fn(),
  set: vi.fn(),
  invalidate: vi.fn(),
};
vi.mock('../context/FeedCacheContext', () => ({
  useFeedCache: () => mockFeedCache,
}));

import { fetchFeed } from '../services/feedApi';
import { useFeed } from './useFeed';

const mockFetchFeed = vi.mocked(fetchFeed);

function makeVideo(id: string): FeedVideo {
  return {
    videoId: id,
    title: `Video ${id}`,
    channelId: 'ch1',
    channelTitle: 'Channel 1',
    thumbnailUrl: 'http://example.com/thumb.jpg',
    publishedAt: '2024-01-01T00:00:00Z',
    source: 'subscription',
  };
}

describe('useFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFeedCache.get.mockReturnValue(undefined);
  });

  it('does not fetch and returns empty videos when profileId is null', async () => {
    const { result } = renderHook(() => useFeed(null));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.videos).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.hasLoadedOnce).toBe(false);
    expect(mockFetchFeed).not.toHaveBeenCalled();
  });

  it('fetches initial feed and populates videos', async () => {
    const videos = [makeVideo('v1'), makeVideo('v2')];
    mockFetchFeed.mockResolvedValueOnce({ videos, nextPageToken: 'token-1' });

    const { result } = renderHook(() => useFeed('profile-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.hasLoadedOnce).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.videos).toEqual(videos);
    expect(result.current.nextPageToken).toBe('token-1');
    expect(result.current.error).toBeNull();
    expect(mockFetchFeed).toHaveBeenCalledWith('profile-1', { source: undefined });
  });

  it('uses cached data without calling the API', async () => {
    const cachedVideos = [makeVideo('c1')];
    mockFeedCache.get.mockReturnValue({ videos: cachedVideos, nextPageToken: 'cached-token' });

    const { result } = renderHook(() => useFeed('profile-1'));

    await waitFor(() => {
      expect(result.current.hasLoadedOnce).toBe(true);
    });

    expect(result.current.videos).toEqual(cachedVideos);
    expect(result.current.nextPageToken).toBe('cached-token');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockFetchFeed).not.toHaveBeenCalled();
  });

  it('sets error when fetchFeed rejects', async () => {
    mockFetchFeed.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFeed('profile-1'));

    await waitFor(() => {
      expect(result.current.hasLoadedOnce).toBe(true);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('Network error');
    expect(result.current.videos).toEqual([]);
  });

  it('loads more videos when loadMore is called', async () => {
    const page1 = [makeVideo('v1')];
    const page2 = [makeVideo('v2')];
    mockFetchFeed
      .mockResolvedValueOnce({ videos: page1, nextPageToken: 'page-2-token' })
      .mockResolvedValueOnce({ videos: page2, nextPageToken: undefined });

    const { result } = renderHook(() => useFeed('profile-1'));

    await waitFor(() => {
      expect(result.current.hasLoadedOnce).toBe(true);
    });

    expect(result.current.videos).toEqual(page1);
    expect(result.current.nextPageToken).toBe('page-2-token');

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isFetchingMore).toBe(false);
    });

    expect(result.current.videos).toEqual([...page1, ...page2]);
    expect(result.current.nextPageToken).toBeUndefined();
    expect(mockFetchFeed).toHaveBeenCalledWith('profile-1', {
      source: undefined,
      pageToken: 'page-2-token',
    });
  });

  it('deduplicates videos when loadMore returns overlapping ids', async () => {
    const page1 = [makeVideo('v1'), makeVideo('v2')];
    const page2 = [makeVideo('v2'), makeVideo('v3')];
    mockFetchFeed
      .mockResolvedValueOnce({ videos: page1, nextPageToken: 'page-2-token' })
      .mockResolvedValueOnce({ videos: page2, nextPageToken: undefined });

    const { result } = renderHook(() => useFeed('profile-1'));

    await waitFor(() => {
      expect(result.current.hasLoadedOnce).toBe(true);
    });

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.isFetchingMore).toBe(false);
    });

    const videoIds = result.current.videos.map((v) => v.videoId);
    expect(videoIds).toEqual(['v1', 'v2', 'v3']);
  });
});
