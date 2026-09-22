import React, { createContext, useContext, useCallback, useRef } from 'react';
import type { FeedVideo } from '../types/feed';

interface CachedFeed {
  videos: FeedVideo[];
  nextPageToken?: string;
  cachedAt: number;
}

interface FeedCacheContextType {
  get: (profileId: string, source?: string) => CachedFeed | undefined;
  set: (profileId: string, source: string | undefined, videos: FeedVideo[], nextPageToken?: string) => void;
  invalidate: (profileId?: string) => void;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const FeedCacheContext = createContext<FeedCacheContextType | undefined>(undefined);

function makeCacheKey(profileId: string, source?: string): string {
  return `${profileId}:${source ?? 'all'}`;
}

export function FeedCacheProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef(new Map<string, CachedFeed>());

  const get = useCallback((profileId: string, source?: string): CachedFeed | undefined => {
    const key = makeCacheKey(profileId, source);
    const entry = cacheRef.current.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      cacheRef.current.delete(key);
      return undefined;
    }
    return entry;
  }, []);

  const set = useCallback((profileId: string, source: string | undefined, videos: FeedVideo[], nextPageToken?: string) => {
    const key = makeCacheKey(profileId, source);
    cacheRef.current.set(key, { videos, nextPageToken, cachedAt: Date.now() });
  }, []);

  const invalidate = useCallback((profileId?: string) => {
    if (profileId) {
      for (const key of cacheRef.current.keys()) {
        if (key.startsWith(`${profileId}:`)) {
          cacheRef.current.delete(key);
        }
      }
    } else {
      cacheRef.current.clear();
    }
  }, []);

  return (
    <FeedCacheContext.Provider value={{ get, set, invalidate }}>
      {children}
    </FeedCacheContext.Provider>
  );
}

export function useFeedCache(): FeedCacheContextType {
  const context = useContext(FeedCacheContext);
  if (!context) {
    throw new Error('useFeedCache must be used within a FeedCacheProvider');
  }
  return context;
}
