import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPlaylistItemsList = vi.fn();
const mockSearchList = vi.fn();
const mockSubscriptionsList = vi.fn();
const mockVideosList = vi.fn();

vi.mock('googleapis', () => {
  class MockOAuth2 {
    setCredentials = vi.fn();
    getAccessToken = vi.fn().mockResolvedValue({ token: 'new-token' });
  }
  return {
    google: {
      auth: { OAuth2: MockOAuth2 },
      youtube: vi.fn(() => ({
        playlistItems: { list: mockPlaylistItemsList },
        search: { list: mockSearchList },
        subscriptions: { list: mockSubscriptionsList },
        videos: { list: mockVideosList },
      })),
    },
  };
});

vi.mock('../utils/prisma', () => ({
  default: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    profile: { findFirst: vi.fn() },
  },
}));

vi.mock('../utils/config', () => ({
  config: {
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    CACHE_TTL_CHANNEL_SECONDS: 600,
    CACHE_TTL_KEYWORD_SECONDS: 300,
    FEED_PUBLISHED_AFTER_DAYS: 14,
    QUOTA_DAILY_LIMIT: 9000,
  },
}));

vi.mock('../utils/encryption', () => ({
  encrypt: vi.fn((text: string) => `encrypted:${text}`),
  decrypt: vi.fn((text: string) => text.replace('encrypted:', '')),
}));

vi.mock('../utils/cache', () => ({
  cache: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), clear: vi.fn() },
}));

vi.mock('../utils/quota', () => ({
  quotaTracker: { record: vi.fn(), wouldExceed: vi.fn(), getUsage: vi.fn() },
  QUOTA_COSTS: {
    'search.list': 100,
    'playlistItems.list': 1,
    'channels.list': 1,
    'subscriptions.list': 1,
  },
}));

import prisma from '../utils/prisma';
import { cache } from '../utils/cache';
import {
  isInsufficientScopeError,
  getChannelVideos,
  searchVideos,
  getUserSubscriptions,
  filterEmbeddableVideos,
} from './youtube.service';

const mockedUserFindUnique = vi.mocked(prisma.user.findUnique);
const mockedCacheGet = vi.mocked(cache.get);
const mockedCacheSet = vi.mocked(cache.set);

const mockUser = {
  id: 'user-1',
  accessToken: 'encrypted:access-token',
  refreshToken: 'encrypted:refresh-token',
  email: 'test@example.com',
};

describe('isInsufficientScopeError', () => {
  it('returns true for 403 with insufficientPermissions reason', () => {
    const error = {
      code: 403,
      errors: [{ reason: 'insufficientPermissions' }],
    };
    expect(isInsufficientScopeError(error)).toBe(true);
  });

  it('returns false for 403 without insufficientPermissions reason', () => {
    const error = {
      code: 403,
      errors: [{ reason: 'forbidden' }],
    };
    expect(isInsufficientScopeError(error)).toBe(false);
  });

  it('returns false for non-object input', () => {
    expect(isInsufficientScopeError('string')).toBe(false);
    expect(isInsufficientScopeError(42)).toBe(false);
    expect(isInsufficientScopeError(undefined)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isInsufficientScopeError(null)).toBe(false);
  });

  it('returns false when errors array is missing', () => {
    const error = { code: 403 };
    expect(isInsufficientScopeError(error)).toBe(false);
  });
});

describe('getUserSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws a re-authentication error when the stored refresh token is missing', async () => {
    mockedUserFindUnique.mockResolvedValue({
      ...mockUser,
      refreshToken: '',
    } as any);

    await expect(getUserSubscriptions('user-1')).rejects.toThrow(
      'YouTube credentials are missing. Please log out and sign in again.',
    );
    expect(mockSubscriptionsList).not.toHaveBeenCalled();
  });
});

describe('getChannelVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached data on cache hit', async () => {
    const cachedResult = {
      videos: [{ videoId: 'v1', title: 'Cached Video', source: 'subscription' as const }],
    };
    mockedCacheGet.mockResolvedValue(cachedResult as any);

    const result = await getChannelVideos('user-1', { channelId: 'UCxyz' });

    expect(result).toEqual(cachedResult);
    expect(mockPlaylistItemsList).not.toHaveBeenCalled();
  });

  it('calls playlistItems.list on cache miss and caches the result', async () => {
    mockedCacheGet.mockResolvedValue(undefined);
    mockedUserFindUnique.mockResolvedValue(mockUser as any);
    mockPlaylistItemsList.mockResolvedValue({
      data: {
        items: [
          {
            snippet: {
              resourceId: { videoId: 'v1' },
              title: 'Test Video',
              description: 'desc',
              channelId: 'UCxyz',
              channelTitle: 'Test Channel',
              thumbnails: { medium: { url: 'http://thumb.jpg' } },
              publishedAt: '2024-01-01T00:00:00Z',
            },
          },
        ],
        nextPageToken: undefined,
      },
    });

    const result = await getChannelVideos('user-1', { channelId: 'UCxyz' });

    expect(mockPlaylistItemsList).toHaveBeenCalled();
    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].videoId).toBe('v1');
    expect(result.videos[0].source).toBe('subscription');
    expect(mockedCacheSet).toHaveBeenCalled();
  });

  it('converts UC channel ID to UU playlist ID', async () => {
    mockedCacheGet.mockResolvedValue(undefined);
    mockedUserFindUnique.mockResolvedValue(mockUser as any);
    mockPlaylistItemsList.mockResolvedValue({
      data: { items: [], nextPageToken: undefined },
    });

    await getChannelVideos('user-1', { channelId: 'UCabcdef' });

    const callArgs = mockPlaylistItemsList.mock.calls[0][0];
    expect(callArgs.playlistId).toBe('UUabcdef');
  });
});

describe('searchVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cached data on cache hit', async () => {
    const cachedResult = {
      videos: [{ videoId: 'sv1', title: 'Cached Search', source: 'search' as const }],
    };
    mockedCacheGet.mockResolvedValue(cachedResult as any);

    const result = await searchVideos('user-1', { query: 'test' });

    expect(result).toEqual(cachedResult);
    expect(mockSearchList).not.toHaveBeenCalled();
  });

  it('calls search.list on cache miss and caches the result', async () => {
    mockedCacheGet.mockResolvedValue(undefined);
    mockedUserFindUnique.mockResolvedValue(mockUser as any);
    mockSearchList.mockResolvedValue({
      data: {
        items: [
          {
            id: { videoId: 'sv1' },
            snippet: {
              title: 'Search Result',
              description: 'desc',
              channelId: 'ch1',
              channelTitle: 'Channel',
              thumbnails: { medium: { url: 'http://thumb.jpg' } },
              publishedAt: '2024-01-01T00:00:00Z',
            },
          },
        ],
        nextPageToken: undefined,
      },
    });

    const result = await searchVideos('user-1', { query: 'test' });

    expect(mockSearchList).toHaveBeenCalled();
    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].videoId).toBe('sv1');
    expect(mockedCacheSet).toHaveBeenCalled();
  });

  it('sets source to "search" when no channelId is provided', async () => {
    mockedCacheGet.mockResolvedValue(undefined);
    mockedUserFindUnique.mockResolvedValue(mockUser as any);
    mockSearchList.mockResolvedValue({
      data: {
        items: [
          {
            id: { videoId: 'sv1' },
            snippet: {
              title: 'Result',
              description: '',
              channelId: 'ch1',
              channelTitle: 'Ch',
              thumbnails: { medium: { url: '' } },
              publishedAt: '2024-01-01T00:00:00Z',
            },
          },
        ],
      },
    });

    const result = await searchVideos('user-1', { query: 'test' });
    expect(result.videos[0].source).toBe('search');
  });

  it('sets source to "subscription" when channelId is provided', async () => {
    mockedCacheGet.mockResolvedValue(undefined);
    mockedUserFindUnique.mockResolvedValue(mockUser as any);
    mockSearchList.mockResolvedValue({
      data: {
        items: [
          {
            id: { videoId: 'sv2' },
            snippet: {
              title: 'Channel Result',
              description: '',
              channelId: 'UCxyz',
              channelTitle: 'Ch',
              thumbnails: { medium: { url: '' } },
              publishedAt: '2024-01-01T00:00:00Z',
            },
          },
        ],
      },
    });

    const result = await searchVideos('user-1', { channelId: 'UCxyz' });
    expect(result.videos[0].source).toBe('subscription');
  });
});

describe('getUserSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mapped subscriptions from paginated API response', async () => {
    mockedUserFindUnique.mockResolvedValue(mockUser as any);
    mockSubscriptionsList.mockResolvedValue({
      data: {
        items: [
          {
            snippet: {
              resourceId: { channelId: 'UC111' },
              title: 'Channel One',
              thumbnails: { default: { url: 'http://thumb1.jpg' } },
              description: 'First channel',
            },
          },
          {
            snippet: {
              resourceId: { channelId: 'UC222' },
              title: 'Channel Two',
              thumbnails: { default: { url: 'http://thumb2.jpg' } },
              description: 'Second channel',
            },
          },
        ],
        nextPageToken: undefined,
      },
    });

    const subs = await getUserSubscriptions('user-1');

    expect(subs).toHaveLength(2);
    expect(subs[0]).toEqual({
      youtubeChannelId: 'UC111',
      channelTitle: 'Channel One',
      thumbnailUrl: 'http://thumb1.jpg',
      description: 'First channel',
    });
    expect(subs[1].youtubeChannelId).toBe('UC222');
  });

  it('throws when user is not found', async () => {
    mockedUserFindUnique.mockResolvedValue(null);

    await expect(getUserSubscriptions('nonexistent')).rejects.toThrow('User not found');
  });
});

describe('filterEmbeddableVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches duration from videos.list response and caches embeddable metadata', async () => {
    mockedCacheGet.mockResolvedValue(undefined);
    mockedUserFindUnique.mockResolvedValue(mockUser as any);
    mockVideosList.mockResolvedValue({
      data: {
        items: [
          {
            id: 'v1',
            status: { embeddable: true },
            contentDetails: { duration: 'PT4M13S' },
          },
        ],
      },
    });

    const result = await filterEmbeddableVideos('user-1', [
      {
        videoId: 'v1',
        title: 'Video 1',
        description: 'desc',
        channelId: 'ch1',
        channelTitle: 'Channel 1',
        thumbnailUrl: 'http://thumb.jpg',
        publishedAt: '2024-01-01T00:00:00Z',
        source: 'subscription',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.duration).toBe('PT4M13S');
    expect(mockedCacheSet).toHaveBeenCalledWith(
      'embeddable:v1',
      { embeddable: true, duration: 'PT4M13S' },
      3600,
    );
  });

  it('attaches duration from cached embeddability metadata on cache hit', async () => {
    mockedCacheGet.mockResolvedValue({ embeddable: true, duration: 'PT1M05S' } as any);

    const result = await filterEmbeddableVideos('user-1', [
      {
        videoId: 'v1',
        title: 'Video 1',
        description: 'desc',
        channelId: 'ch1',
        channelTitle: 'Channel 1',
        thumbnailUrl: 'http://thumb.jpg',
        publishedAt: '2024-01-01T00:00:00Z',
        source: 'search',
      },
    ]);

    expect(mockVideosList).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.duration).toBe('PT1M05S');
  });

  it('supports legacy boolean cache entries without duration', async () => {
    mockedCacheGet.mockResolvedValue(true as any);

    const result = await filterEmbeddableVideos('user-1', [
      {
        videoId: 'v1',
        title: 'Video 1',
        description: 'desc',
        channelId: 'ch1',
        channelTitle: 'Channel 1',
        thumbnailUrl: 'http://thumb.jpg',
        publishedAt: '2024-01-01T00:00:00Z',
        source: 'search',
      },
    ]);

    expect(mockVideosList).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]?.duration).toBeUndefined();
  });
});
