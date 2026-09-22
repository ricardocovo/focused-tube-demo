import { useState, useEffect, useCallback, useRef } from 'react';
import type { CommunityProfile, CommunityProfilesResponse } from '../types/profile';
import * as communityApi from '../services/communityApi';

export function useCommunity() {
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [keyword, setKeywordState] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const setKeyword = useCallback((value: string) => {
    setKeywordState(value);
    setPage(1);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(value);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchProfiles() {
      setIsLoading(true);
      setError('');
      try {
        const params: { keyword?: string; page: number; limit: number } = { page, limit };
        if (debouncedKeyword) {
          params.keyword = debouncedKeyword;
        }
        const data: CommunityProfilesResponse = await communityApi.fetchCommunityProfiles(params);
        if (!cancelled) {
          setProfiles(data.profiles);
          setTotal(data.total);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load community profiles.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    fetchProfiles();
    return () => { cancelled = true; };
  }, [debouncedKeyword, page, limit]);

  const handleFollow = useCallback(async (profileId: string) => {
    const previous = profiles;
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? { ...p, isFollowing: true, _count: { ...p._count, followers: p._count.followers + 1 } }
          : p,
      ),
    );
    try {
      await communityApi.followProfile(profileId);
    } catch {
      setProfiles(previous);
    }
  }, [profiles]);

  const handleUnfollow = useCallback(async (profileId: string) => {
    const previous = profiles;
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId
          ? { ...p, isFollowing: false, _count: { ...p._count, followers: Math.max(0, p._count.followers - 1) } }
          : p,
      ),
    );
    try {
      await communityApi.unfollowProfile(profileId);
    } catch {
      setProfiles(previous);
    }
  }, [profiles]);

  return {
    profiles,
    total,
    page,
    setPage,
    limit,
    keyword: keyword,
    setKeyword,
    isLoading,
    error,
    handleFollow,
    handleUnfollow,
  };
}
