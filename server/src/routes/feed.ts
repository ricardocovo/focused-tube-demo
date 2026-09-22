import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { authenticateJwt } from '../middleware/auth';
import { searchVideos, getChannelVideos, filterEmbeddableVideos, Video, isInsufficientScopeError } from '../services/youtube.service';
import { config } from '../utils/config';
import { quotaTracker, QUOTA_COSTS } from '../utils/quota';

const router = Router();
router.use(authenticateJwt);

function isQuotaError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const e = error as any;
    if (e.code === 403 && e.errors?.[0]?.reason === 'quotaExceeded') return true;
    if (e.code === 403 && typeof e.message === 'string' && e.message.toLowerCase().includes('quota')) return true;
  }
  return false;
}

router.get('/:profileId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profileId = Array.isArray(req.params.profileId)
      ? req.params.profileId[0]
      : req.params.profileId;

    const source = req.query.source as string | undefined;
    const pageToken = req.query.pageToken as string | undefined;

    if (source !== undefined && source !== 'subscriptions' && source !== 'search') {
      res.status(400).json({ error: 'source must be "subscriptions" or "search"' });
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: { channels: true, keywords: true },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    let feedUserId = req.user!.id;

    if (profile.userId !== req.user!.id) {
      // Check if user follows this profile and it's public
      const follow = await prisma.profileFollow.findUnique({
        where: {
          followerId_profileId: {
            followerId: req.user!.id,
            profileId: profileId,
          },
        },
      });

      if (!follow || !profile.isPublic) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Use the profile owner's credentials for YouTube API calls
      feedUserId = profile.userId;
    }

    if (profile.channels.length === 0 && profile.keywords.length === 0) {
      res.json({ videos: [] });
      return;
    }

    const userId = feedUserId;
    const promises: Promise<{ videos: Video[]; nextPageToken?: string }>[] = [];
    const promiseLabels: ('subscription' | 'search')[] = [];

    // Compute publishedAfter cutoff date
    const publishedAfterDate = new Date();
    publishedAfterDate.setDate(publishedAfterDate.getDate() - config.FEED_PUBLISHED_AFTER_DAYS);
    const publishedAfter = publishedAfterDate.toISOString();

    // Quota guard: estimate cost and reject early if it would exceed limit
    const channelCount = source !== 'search' ? profile.channels.length : 0;
    const keywordCount = source !== 'subscriptions' ? profile.keywords.length : 0;
    const estimatedCost =
      channelCount * QUOTA_COSTS['playlistItems.list'] +
      keywordCount * QUOTA_COSTS['search.list'];

    if (estimatedCost > 0 && quotaTracker.wouldExceed('search.list', keywordCount) &&
        quotaTracker.wouldExceed('playlistItems.list', channelCount)) {
      res.status(429).json({
        error: 'YouTube API daily quota nearly exhausted. Please try again tomorrow.',
        quota: quotaTracker.getUsage(),
      });
      return;
    }

    // Fan out channel uploads (uses playlistItems.list — 1 unit per call)
    if (source !== 'search') {
      for (const channel of profile.channels) {
        promises.push(
          getChannelVideos(userId, {
            channelId: channel.youtubeChannelId,
            maxResults: 20,
            publishedAfter,
            pageToken,
          }),
        );
        promiseLabels.push('subscription');
      }
    }

    // Fan out keyword searches (uses search.list — 100 units per call)
    if (source !== 'subscriptions') {
      for (const kw of profile.keywords) {
        promises.push(
          searchVideos(userId, {
            query: kw.keyword,
            maxResults: 20,
            publishedAfter,
            pageToken,
          }),
        );
        promiseLabels.push('search');
      }
    }

    const results = await Promise.allSettled(promises);

    // Check for scope or quota errors in rejected promises
    for (const result of results) {
      if (result.status === 'rejected') {
        if (isInsufficientScopeError(result.reason)) {
          res.status(403).json({ error: 'Insufficient YouTube permissions. Please log out and sign in again to grant the required access.' });
          return;
        }
        if (isQuotaError(result.reason)) {
          res.status(429).json({ error: 'YouTube API daily quota exceeded. Please try again tomorrow.' });
          return;
        }
      }
    }

    // If ALL promises failed, surface the error instead of returning empty results
    const allFailed = results.length > 0 && results.every((r) => r.status === 'rejected');
    if (allFailed) {
      const firstError = (results[0] as PromiseRejectedResult).reason;
      const message = firstError?.message || 'Failed to fetch videos';
      res.status(502).json({ error: message });
      return;
    }

    // Collect videos, deduplicating by videoId (subscription wins)
    const videoMap = new Map<string, Video>();
    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const video of result.value.videos) {
          const existing = videoMap.get(video.videoId);
          if (!existing || (existing.source === 'search' && video.source === 'subscription')) {
            videoMap.set(video.videoId, video);
          }
        }
      }
    }

    // Filter out non-embeddable videos (fails open on API error)
    const deduped = Array.from(videoMap.values());
    const embeddable = await filterEmbeddableVideos(userId, deduped);

    // Sort by publishedAt descending
    const videos = embeddable.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

    // Pick nextPageToken: first subscription result that has one, else first search result
    let nextPageToken: string | undefined;
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value.nextPageToken) {
        if (promiseLabels[i] === 'subscription') {
          nextPageToken = result.value.nextPageToken;
          break;
        }
        if (!nextPageToken) {
          nextPageToken = result.value.nextPageToken;
        }
      }
    }

    res.json({ videos, nextPageToken });
  } catch (error) {
    next(error);
  }
});

export default router;
