import { useState, useEffect, useCallback } from 'react';
import type { CommunityProfile } from '../types/profile';
import { fetchFollowedProfiles, unfollowProfile } from '../services/communityApi';

export function useFollowedProfiles() {
  const [followedProfiles, setFollowedProfiles] = useState<CommunityProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadFollowed = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchFollowedProfiles();
      setFollowedProfiles(data);
    } catch {
      setFollowedProfiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowed();
  }, [loadFollowed]);

  const handleUnfollow = useCallback(async (profileId: string) => {
    const previous = followedProfiles;
    setFollowedProfiles((prev) => prev.filter((p) => p.id !== profileId));
    try {
      await unfollowProfile(profileId);
    } catch {
      setFollowedProfiles(previous);
      throw new Error('Failed to unfollow');
    }
  }, [followedProfiles]);

  return { followedProfiles, isLoading, loadFollowed, handleUnfollow };
}
