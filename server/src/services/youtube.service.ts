import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../utils/prisma';
import { config } from '../utils/config';
import { encrypt, decrypt } from '../utils/encryption';
import { cache } from '../utils/cache';
import { quotaTracker } from '../utils/quota';

export interface Subscription {
  youtubeChannelId: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  description: string;
}

export interface Video {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  source: 'subscription' | 'search';
  duration?: string;
}

export interface SearchVideosParams {
  channelId?: string;
  query?: string;
  maxResults?: number;
  publishedAfter?: string;
  pageToken?: string;
}

export interface GetChannelVideosParams {
  channelId: string;
  maxResults?: number;
  publishedAfter?: string;
  pageToken?: string;
}

export interface GetChannelVideosResult {
  videos: Video[];
  nextPageToken?: string;
}

export interface SearchVideosResult {
  videos: Video[];
  nextPageToken?: string;
}

function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
  );
}

async function getAuthenticatedClient(userId: string): Promise<{
  oauth2Client: OAuth2Client;
  youtube: youtube_v3.Youtube;
}> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.accessToken || !user.refreshToken) {
    throw new Error('YouTube credentials are missing. Please log out and sign in again.');
  }

  const accessToken = decrypt(user.accessToken);
  const refreshToken = decrypt(user.refreshToken);

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  return { oauth2Client, youtube };
}

async function refreshAndSaveToken(
  userId: string,
  oauth2Client: OAuth2Client,
  encryptedRefreshToken: string,
): Promise<void> {
  const refreshToken = decrypt(encryptedRefreshToken);

  // Create a fresh client with only the refresh token to force a refresh
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2Client.getAccessToken();

  if (!token) {
    throw new Error('Failed to refresh access token');
  }

  const newEncryptedAccessToken = encrypt(token);
  await prisma.user.update({
    where: { id: userId },
    data: { accessToken: newEncryptedAccessToken },
  });

  oauth2Client.setCredentials({
    access_token: token,
    refresh_token: refreshToken,
  });
}

function isUnauthorizedError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: number }).code === 401
  );
}

export function isInsufficientScopeError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const e = error as any;
    return (
      e.code === 403 &&
      Array.isArray(e.errors) &&
      e.errors.some((err: any) => err.reason === 'insufficientPermissions')
    );
  }
  return false;
}

export async function getUserSubscriptions(userId: string): Promise<Subscription[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const { oauth2Client, youtube } = await getAuthenticatedClient(userId);

  try {
    return await fetchAllSubscriptions(youtube);
  } catch (error) {
    if (isUnauthorizedError(error)) {
      await refreshAndSaveToken(userId, oauth2Client, user.refreshToken);
      const retryYoutube = google.youtube({ version: 'v3', auth: oauth2Client });
      return await fetchAllSubscriptions(retryYoutube);
    }
    throw error;
  }
}

async function fetchAllSubscriptions(youtube: youtube_v3.Youtube): Promise<Subscription[]> {
  const subscriptions: Subscription[] = [];
  let pageToken: string | undefined;

  do {
    const response: youtube_v3.Schema$SubscriptionListResponse = (
      await youtube.subscriptions.list({
        part: ['snippet'],
        mine: true,
        maxResults: 50,
        pageToken,
      })
    ).data;

    const items = response.items ?? [];
    for (const item of items) {
      const snippet = item.snippet;
      if (snippet?.resourceId?.channelId) {
        subscriptions.push({
          youtubeChannelId: snippet.resourceId.channelId,
          channelTitle: snippet.title ?? '',
          thumbnailUrl: snippet.thumbnails?.default?.url ?? null,
          description: snippet.description ?? '',
        });
      }
    }

    pageToken = response.nextPageToken ?? undefined;
  } while (pageToken);

  return subscriptions;
}

/**
 * Derive the uploads playlist ID from a channel ID.
 * YouTube channels with IDs starting with "UC" have an uploads playlist
 * with the same suffix but prefixed with "UU".
 */
function getUploadsPlaylistId(channelId: string): string {
  if (channelId.startsWith('UC')) {
    return 'UU' + channelId.slice(2);
  }
  return channelId;
}

/**
 * Fetch recent videos from a channel using playlistItems.list (1 unit)
 * instead of search.list (100 units).
 */
export async function getChannelVideos(
  userId: string,
  params: GetChannelVideosParams,
): Promise<GetChannelVideosResult> {
  // Check cache first (only for initial page — paginated requests bypass cache)
  const cacheKey = `channel:${params.channelId}:${params.publishedAfter ?? ''}`;
  if (!params.pageToken) {
    const cached = await cache.get<GetChannelVideosResult>(cacheKey);
    if (cached) return cached;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const { oauth2Client, youtube } = await getAuthenticatedClient(userId);
  const playlistId = getUploadsPlaylistId(params.channelId);

  try {
    const result = await fetchPlaylistItems(youtube, playlistId, params);
    if (!params.pageToken) {
      await cache.set(cacheKey, result, config.CACHE_TTL_CHANNEL_SECONDS);
    }
    return result;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      await refreshAndSaveToken(userId, oauth2Client, user.refreshToken);
      const retryYoutube = google.youtube({ version: 'v3', auth: oauth2Client });
      const result = await fetchPlaylistItems(retryYoutube, playlistId, params);
      if (!params.pageToken) {
        await cache.set(cacheKey, result, config.CACHE_TTL_CHANNEL_SECONDS);
      }
      return result;
    }
    // Graceful fallback: if the uploads playlist is private/unavailable, return empty
    if (isPlaylistNotFoundError(error)) {
      console.debug(`Uploads playlist ${playlistId} not found for channel ${params.channelId}, returning empty`);
      return { videos: [] };
    }
    throw error;
  }
}

function isPlaylistNotFoundError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const e = error as any;
    return e.code === 404 || (e.code === 403 && e.message?.includes('playlistItemsNotAccessible'));
  }
  return false;
}

async function fetchPlaylistItems(
  youtube: youtube_v3.Youtube,
  playlistId: string,
  params: GetChannelVideosParams,
): Promise<GetChannelVideosResult> {
  const response = await youtube.playlistItems.list({
    part: ['snippet'],
    playlistId,
    maxResults: params.maxResults ?? 20,
    pageToken: params.pageToken,
  });
  quotaTracker.record('playlistItems.list');

  let videos: Video[] = (response.data.items ?? [])
    .filter((item) => item.snippet?.resourceId?.videoId && item.snippet)
    .map((item) => ({
      videoId: item.snippet!.resourceId!.videoId!,
      title: item.snippet!.title ?? '',
      description: item.snippet!.description ?? '',
      channelId: item.snippet!.channelId ?? '',
      channelTitle: item.snippet!.channelTitle ?? '',
      thumbnailUrl: item.snippet!.thumbnails?.medium?.url ?? '',
      publishedAt: item.snippet!.publishedAt ?? '',
      source: 'subscription' as const,
    }));

  // playlistItems.list does not support publishedAfter, so filter post-fetch
  if (params.publishedAfter) {
    const cutoff = new Date(params.publishedAfter).getTime();
    videos = videos.filter((v) => new Date(v.publishedAt).getTime() >= cutoff);
  }

  return {
    videos,
    nextPageToken: response.data.nextPageToken ?? undefined,
  };
}

export async function searchVideos(
  userId: string,
  params: SearchVideosParams,
): Promise<SearchVideosResult> {
  // Check cache first (only for initial page — paginated requests bypass cache)
  const cacheKey = `search:${params.query ?? ''}:${params.publishedAfter ?? ''}`;
  if (!params.pageToken) {
    const cached = await cache.get<SearchVideosResult>(cacheKey);
    if (cached) return cached;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const { oauth2Client, youtube } = await getAuthenticatedClient(userId);

  const requestParams: youtube_v3.Params$Resource$Search$List = {
    part: ['snippet'],
    type: ['video'],
    order: 'date',
    maxResults: params.maxResults ?? 25,
  };

  if (params.channelId) requestParams.channelId = params.channelId;
  if (params.query) requestParams.q = params.query;
  if (params.publishedAfter) requestParams.publishedAfter = params.publishedAfter;
  if (params.pageToken) requestParams.pageToken = params.pageToken;

  const source: Video['source'] = params.channelId ? 'subscription' : 'search';

  try {
    const result = await executeSearch(youtube, requestParams, source);
    if (!params.pageToken) {
      await cache.set(cacheKey, result, config.CACHE_TTL_KEYWORD_SECONDS);
    }
    return result;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      await refreshAndSaveToken(userId, oauth2Client, user.refreshToken);
      const retryYoutube = google.youtube({ version: 'v3', auth: oauth2Client });
      const result = await executeSearch(retryYoutube, requestParams, source);
      if (!params.pageToken) {
        await cache.set(cacheKey, result, config.CACHE_TTL_KEYWORD_SECONDS);
      }
      return result;
    }
    throw error;
  }
}

async function executeSearch(
  youtube: youtube_v3.Youtube,
  requestParams: youtube_v3.Params$Resource$Search$List,
  source: Video['source'],
): Promise<SearchVideosResult> {
  const response = await youtube.search.list(requestParams);
  quotaTracker.record('search.list');

  const videos: Video[] = (response.data.items ?? [])
    .filter((item) => item.id?.videoId && item.snippet)
    .map((item) => ({
      videoId: item.id!.videoId!,
      title: item.snippet!.title ?? '',
      description: item.snippet!.description ?? '',
      channelId: item.snippet!.channelId ?? '',
      channelTitle: item.snippet!.channelTitle ?? '',
      thumbnailUrl: item.snippet!.thumbnails?.medium?.url ?? '',
      publishedAt: item.snippet!.publishedAt ?? '',
      source,
    }));

  return {
    videos,
    nextPageToken: response.data.nextPageToken ?? undefined,
  };
}

const EMBEDDABLE_CACHE_TTL_SECONDS = 3600; // 1 hour
interface EmbeddableCacheEntry {
  embeddable: boolean;
  duration?: string;
}

/**
 * Filter a list of videos to only those that are embeddable.
 * Uses videos.list with part=status,contentDetails in batches of 50.
 * Caches results per video ID. Fails open on API errors.
 */
export async function filterEmbeddableVideos(
  userId: string,
  videos: Video[],
): Promise<Video[]> {
  if (videos.length === 0) return videos;

  const uncachedVideoIds: string[] = [];
  const embeddableMap = new Map<string, boolean>();
  const durationMap = new Map<string, string>();

  // Check cache for each video
  for (const video of videos) {
    const cacheKey = `embeddable:${video.videoId}`;
    const cached = await cache.get<boolean | EmbeddableCacheEntry>(cacheKey);
    if (cached !== undefined) {
      if (typeof cached === 'boolean') {
        // Backward compatibility with existing boolean-only cache entries.
        embeddableMap.set(video.videoId, cached);
      } else {
        embeddableMap.set(video.videoId, cached.embeddable);
        if (cached.duration) {
          durationMap.set(video.videoId, cached.duration);
        }
      }
    } else {
      uncachedVideoIds.push(video.videoId);
    }
  }

  // Fetch embeddability for uncached videos in batches of 50
  if (uncachedVideoIds.length > 0) {
    try {
      const { youtube } = await getAuthenticatedClient(userId);
      const BATCH_SIZE = 50;

      for (let i = 0; i < uncachedVideoIds.length; i += BATCH_SIZE) {
        const batch = uncachedVideoIds.slice(i, i + BATCH_SIZE);
        const response = await youtube.videos.list({
          part: ['status', 'contentDetails'],
          id: batch,
        });
        quotaTracker.record('videos.list');

        const items = response.data.items ?? [];
        const returnedIds = new Set<string>();

        for (const item of items) {
          if (item.id) {
            const isEmbeddable = item.status?.embeddable === true;
            embeddableMap.set(item.id, isEmbeddable);
            returnedIds.add(item.id);
            const duration = item.contentDetails?.duration ?? undefined;
            if (duration) durationMap.set(item.id, duration);
            await cache.set<EmbeddableCacheEntry>(
              `embeddable:${item.id}`,
              { embeddable: isEmbeddable, duration },
              EMBEDDABLE_CACHE_TTL_SECONDS,
            );
          }
        }

        // Videos not returned by the API are likely deleted/private — mark non-embeddable
        for (const id of batch) {
          if (!returnedIds.has(id)) {
            embeddableMap.set(id, false);
            await cache.set<EmbeddableCacheEntry>(
              `embeddable:${id}`,
              { embeddable: false },
              EMBEDDABLE_CACHE_TTL_SECONDS,
            );
          }
        }
      }
    } catch (error) {
      // Fail open: if we can't check embeddability, return all videos
      console.warn('[filterEmbeddableVideos] Failed to check embeddability, returning all videos:', error);
      return videos;
    }
  }

  return videos
    .filter((v) => embeddableMap.get(v.videoId) !== false)
    .map((v) => {
      const dur = durationMap.get(v.videoId);
      return dur ? { ...v, duration: dur } : v;
    });
}
