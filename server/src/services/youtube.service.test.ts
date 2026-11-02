import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
  isQuotaError,
  type Video,
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
  const makeVideo = (videoId = 'v1'): Video => ({
    videoId,
    title: 'Video',
    description: '',
    channelId: 'ch1',
    channelTitle: 'Channel',
    thumbnailUrl: 'http://thumb.jpg',
    publishedAt: '2024-01-01T00:00:00Z',
    source: 'subscription',
  });

  beforeEach(() => {
    vi.resetAllMocks();
    mockedUserFindUnique.mockResolvedValue({
      ...mockUser,
      googleId: 'google-1',
      name: 'Test User',
      avatarUrl: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('fetches and caches both statistics with the existing metadata lookup', async () => {
    mockVideosList.mockResolvedValue({
      data: { items: [{
        id: 'v1',
        status: { embeddable: true },
        contentDetails: { duration: 'PT4M13S' },
        statistics: { viewCount: '1234', likeCount: '56' },
      }] },
    });

    const [result] = await filterEmbeddableVideos('user-1', [makeVideo()]);

    expect(result).toMatchObject({ duration: 'PT4M13S', viewCount: 1234, likeCount: 56 });
    expect(mockVideosList).toHaveBeenCalledExactlyOnceWith({
      part: ['status', 'contentDetails', 'statistics'],
      fields: 'items(id,status/embeddable,contentDetails/duration,statistics(viewCount,likeCount))',
      id: ['v1'],
    });
    expect(mockedCacheSet).toHaveBeenCalledWith(
      'embeddable:v1',
      { embeddable: true, duration: 'PT4M13S', viewCount: 1234, likeCount: 56 },
      3600,
    );
  });

  it.each([
    [{ viewCount: '0', likeCount: '0' }, 0, 0],
    [{ viewCount: '123' }, 123, undefined],
    [{ likeCount: '45' }, undefined, 45],
    [{ viewCount: null, likeCount: null }, undefined, undefined],
    [undefined, undefined, undefined],
  ])('handles partial statistics %j without fabricating counts', async (statistics, viewCount, likeCount) => {
    mockVideosList.mockResolvedValue({
      data: { items: [{ id: 'v1', status: { embeddable: true }, statistics }] },
    });
    const [result] = await filterEmbeddableVideos('user-1', [makeVideo()]);
    expect(result?.viewCount).toBe(viewCount);
    expect(result?.likeCount).toBe(likeCount);
    expect(result?.duration).toBeUndefined();
  });

  it.each(['', ' ', '-1', '1.2', '12oops', 'NaN', 'Infinity', '1e3', '9007199254740992'])(
    'omits invalid or unsafe count %j',
    async (value) => {
      mockVideosList.mockResolvedValue({
        data: { items: [{
          id: 'v1', status: { embeddable: true },
          statistics: { viewCount: value, likeCount: value },
        }] },
      });
      const [result] = await filterEmbeddableVideos('user-1', [makeVideo()]);
      expect(result?.viewCount).toBeUndefined();
      expect(result?.likeCount).toBeUndefined();
    },
  );

  it('restores cached statistics without requiring a duration', async () => {
    mockedCacheGet.mockResolvedValue({ embeddable: true, viewCount: 1234, likeCount: 0 });
    const [result] = await filterEmbeddableVideos('user-1', [makeVideo()]);
    expect(result).toMatchObject({ viewCount: 1234, likeCount: 0 });
    expect(mockVideosList).not.toHaveBeenCalled();
  });

  it('fetches only unique cache misses while retaining cached metadata', async () => {
    mockedCacheGet.mockImplementation(async (key) =>
      key === 'embeddable:cached'
        ? { embeddable: true, duration: 'PT1M', viewCount: 10 }
        : undefined);
    mockVideosList.mockResolvedValue({
      data: { items: [{ id: 'new', status: { embeddable: true }, statistics: { likeCount: '2' } }] },
    });
    const videos = [makeVideo('cached'), makeVideo('new'), makeVideo('new')];
    const result = await filterEmbeddableVideos('user-1', videos);
    expect(mockVideosList.mock.calls[0]?.[0].id).toEqual(['new']);
    expect(mockedCacheGet).toHaveBeenCalledTimes(2);
    expect(result[0]).toMatchObject({ viewCount: 10, duration: 'PT1M' });
    expect(result.slice(1).map((video) => video.likeCount)).toEqual([2, 2]);
    expect(videos[0]?.viewCount).toBeUndefined();
  });

  it.each([50, 51])('batches %i unique video IDs at a maximum of 50', async (count) => {
    mockVideosList.mockImplementation(async ({ id }: { id: string[] }) => ({
      data: { items: id.map((videoId) => ({
        id: videoId, status: { embeddable: true }, statistics: { viewCount: '1' },
      })) },
    }));
    const videos = Array.from({ length: count }, (_, i) => makeVideo(`v${i}`));
    const result = await filterEmbeddableVideos('user-1', videos);
    expect(result).toHaveLength(count);
    expect(mockVideosList).toHaveBeenCalledTimes(Math.ceil(count / 50));
    expect(mockVideosList.mock.calls.map(([params]) => params.id.length))
      .toEqual(count === 50 ? [50] : [50, 1]);
    expect(result.every((video) => video.viewCount === 1)).toBe(true);
  });

  it('skips all lookups for an empty feed', async () => {
    expect(await filterEmbeddableVideos('user-1', [])).toEqual([]);
    expect(mockedCacheGet).not.toHaveBeenCalled();
    expect(mockVideosList).not.toHaveBeenCalled();
  });

  it('filters non-embeddable and API-omitted videos and caches the result', async () => {
    mockVideosList.mockResolvedValue({
      data: { items: [{ id: 'blocked', status: { embeddable: false } }] },
    });
    expect(await filterEmbeddableVideos('user-1', [makeVideo('blocked'), makeVideo('missing')]))
      .toEqual([]);
    expect(mockedCacheSet).toHaveBeenCalledWith('embeddable:missing', { embeddable: false }, 3600);
  });

  it('preserves fail-open behavior with a warning for non-quota failures', async () => {
    const error = new Error('Temporary outage');
    mockVideosList.mockRejectedValue(error);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const videos = [makeVideo()];
    expect(await filterEmbeddableVideos('user-1', videos)).toBe(videos);
    expect(warning).toHaveBeenCalledWith(expect.any(String), error);
  });

  it('propagates quota errors rather than returning a successful feed', async () => {
    const error = { code: 403, errors: [{ reason: 'quotaExceeded' }] };
    mockVideosList.mockRejectedValue(error);
    await expect(filterEmbeddableVideos('user-1', [makeVideo()])).rejects.toBe(error);
  });
});

describe('isQuotaError', () => {
  it.each([
    { code: 403, errors: [{ reason: 'quotaExceeded' }] },
    { code: 403, errors: [{ reason: 'other' }, { reason: 'quotaExceeded' }] },
    { response: { status: 403, data: { error: { errors: [{ reason: 'quotaExceeded' }] } } } },
  ])('recognizes Google quota error shape %j', (error) => {
    expect(isQuotaError(error)).toBe(true);
  });

  it.each([null, 'quota', {}, { code: 500 }, {
    code: 403, errors: [{ reason: 'forbidden' }], message: 'Not a quotaExceeded error',
  }])('does not classify unrelated failure %j as quota exhaustion', (error) => {
    expect(isQuotaError(error)).toBe(false);
  });
});
