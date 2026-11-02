import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { createServer } from 'node:http';
import { once } from 'node:events';
import type { Request, Response, NextFunction } from 'express';

const mocks = vi.hoisted(() => ({
  findProfile: vi.fn(),
  findFollow: vi.fn(),
}));

vi.mock('../utils/prisma', () => ({
  default: {
    profile: { findUnique: mocks.findProfile },
    profileFollow: { findUnique: mocks.findFollow },
  },
}));
vi.mock('../middleware/auth', () => ({
  authenticateJwt(req: Request, _res: Response, next: NextFunction) {
    req.user = { id: 'viewer' };
    next();
  },
}));
vi.mock('../utils/config', () => ({ config: { FEED_PUBLISHED_AFTER_DAYS: 14 } }));
vi.mock('../utils/quota', () => ({
  quotaTracker: { wouldExceed: vi.fn(() => false) },
  QUOTA_COSTS: { 'playlistItems.list': 1, 'search.list': 100 },
}));
vi.mock('../services/youtube.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/youtube.service')>();
  return {
    ...actual,
    getChannelVideos: vi.fn(),
    searchVideos: vi.fn(),
    filterEmbeddableVideos: vi.fn(),
  };
});

import feedRouter from './feed';
import { getChannelVideos, searchVideos, filterEmbeddableVideos, type Video } from '../services/youtube.service';

const channelVideos = vi.mocked(getChannelVideos);
const keywordVideos = vi.mocked(searchVideos);
const enrichVideos = vi.mocked(filterEmbeddableVideos);
const profile = {
  id: 'profile-1',
  userId: 'viewer',
  isPublic: false,
  channels: [{ youtubeChannelId: 'channel-1' }],
  keywords: [{ keyword: 'science' }],
};
const makeVideo = (videoId: string, source: Video['source'], publishedAt = '2024-01-01T00:00:00Z'): Video => ({
  videoId, source, publishedAt,
  title: videoId, description: '', channelId: 'channel-1', channelTitle: 'Channel',
  thumbnailUrl: 'http://example.com/thumb.jpg',
});
const quotaResponse = {
  error: 'youtube_quota_exceeded',
  message: 'YouTube API quota exhausted. Try again after midnight Pacific Time.',
};

describe('feed statistics API', () => {
  const app = express();
  app.use('/api/feed', feedRouter);
  const server = createServer(app);
  let baseUrl: string;

  beforeAll(async () => {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected TCP server address');
    baseUrl = `http://127.0.0.1:${address.port}/api/feed/profile-1`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeAllConnections();
    });
  });

  beforeEach(() => {
    vi.resetAllMocks();
    mocks.findProfile.mockResolvedValue(profile);
    channelVideos.mockResolvedValue({ videos: [] });
    keywordVideos.mockResolvedValue({ videos: [] });
    enrichVideos.mockImplementation(async (_userId, videos) => videos.map((video) => ({
      ...video, duration: 'PT1M', viewCount: 1234, likeCount: 0,
    })));
  });

  it('enriches unique IDs after subscription-preferred deduplication and preserves sorting/pagination', async () => {
    channelVideos.mockResolvedValue({
      videos: [makeVideo('shared', 'subscription')],
      nextPageToken: 'channel-next',
    });
    keywordVideos.mockResolvedValue({
      videos: [makeVideo('shared', 'search'), makeVideo('new', 'search', '2024-02-01T00:00:00Z')],
      nextPageToken: 'search-next',
    });
    const response = await fetch(baseUrl);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.nextPageToken).toBe('channel-next');
    expect(body.videos).toEqual([
      { ...makeVideo('new', 'search', '2024-02-01T00:00:00Z'), duration: 'PT1M', viewCount: 1234, likeCount: 0 },
      { ...makeVideo('shared', 'subscription'), duration: 'PT1M', viewCount: 1234, likeCount: 0 },
    ]);
    expect(enrichVideos).toHaveBeenCalledExactlyOnceWith('viewer', [
      makeVideo('shared', 'subscription'), makeVideo('new', 'search', '2024-02-01T00:00:00Z'),
    ]);
  });

  it.each(['subscriptions', 'search'])('preserves source=%s and page tokens', async (source) => {
    const response = await fetch(`${baseUrl}?source=${source}&pageToken=next`);
    expect(response.status).toBe(200);
    const selected = source === 'search' ? keywordVideos : channelVideos;
    const excluded = source === 'search' ? channelVideos : keywordVideos;
    expect(selected).toHaveBeenCalledWith('viewer', expect.objectContaining({ pageToken: 'next' }));
    expect(excluded).not.toHaveBeenCalled();
  });

  it.each(['metadata', 'subscription', 'search'])('normalizes %s quota exhaustion', async (stage) => {
    const error = {
      response: { status: 403, data: { error: { errors: [{ reason: 'quotaExceeded' }] } } },
    };
    if (stage === 'metadata') enrichVideos.mockRejectedValue(error);
    if (stage === 'subscription') channelVideos.mockRejectedValue(error);
    if (stage === 'search') keywordVideos.mockRejectedValue(error);
    const response = await fetch(baseUrl);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual(quotaResponse);
  });

  it('does not enrich a nonexistent profile', async () => {
    mocks.findProfile.mockResolvedValue(null);
    expect((await fetch(baseUrl)).status).toBe(404);
    expect(enrichVideos).not.toHaveBeenCalled();
  });

  it('does not enrich another user private profile', async () => {
    mocks.findProfile.mockResolvedValue({ ...profile, userId: 'owner' });
    mocks.findFollow.mockResolvedValue(null);
    expect((await fetch(baseUrl)).status).toBe(403);
    expect(enrichVideos).not.toHaveBeenCalled();
  });

  it('preserves owner credentials for followed public profiles', async () => {
    mocks.findProfile.mockResolvedValue({ ...profile, userId: 'owner', isPublic: true });
    mocks.findFollow.mockResolvedValue({ id: 'follow-1' });
    expect((await fetch(baseUrl)).status).toBe(200);
    expect(enrichVideos).toHaveBeenCalledWith('owner', []);
  });

  it('rejects invalid source without fetching metadata', async () => {
    expect((await fetch(`${baseUrl}?source=invalid`)).status).toBe(400);
    expect(enrichVideos).not.toHaveBeenCalled();
  });
});
