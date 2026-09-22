import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useFeedCache } from './FeedCacheContext';
import { useFollowedProfiles } from '../hooks/useFollowedProfiles';
import type { Profile, CommunityProfile } from '../types/profile';
import * as profilesApi from '../services/profilesApi';

const STORAGE_KEY = 'ft_active_profile_id';

function toFollowedProfile(profile: CommunityProfile): Profile {
  return {
    id: profile.id,
    name: profile.name,
    isDefault: false,
    isPublic: true,
    userId: '',
    createdAt: '',
    updatedAt: '',
    isFollowing: true,
    owner: { name: profile.user.name, avatarUrl: profile.user.avatarUrl ?? undefined },
  };
}

interface ProfileContextType {
  profiles: Profile[];
  activeProfile: Profile | null;
  isLoading: boolean;
  setActiveProfile: (id: string) => void;
  createProfile: (input: { name: string; isPublic?: boolean }) => Promise<Profile>;
  updateProfile: (id: string, data: { name?: string; isDefault?: boolean; isPublic?: boolean }) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
  followedProfiles: CommunityProfile[];
  followedLoading: boolean;
  unfollowProfile: (profileId: string) => Promise<void>;
  refreshFollowed: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const feedCache = useFeedCache();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfileState] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { followedProfiles, isLoading: followedLoading, loadFollowed: refreshFollowed, handleUnfollow } = useFollowedProfiles();

  const pickActive = useCallback((list: Profile[]) => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    const saved = savedId ? list.find((p) => p.id === savedId) : undefined;
    if (saved) {
      setActiveProfileState(saved);
      return;
    }

    const followed = savedId ? followedProfiles.find((p) => p.id === savedId) : undefined;
    if (followed) {
      setActiveProfileState(toFollowedProfile(followed));
      return;
    }

    if (list.length === 0) {
      setActiveProfileState(followedProfiles[0] ? toFollowedProfile(followedProfiles[0]) : null);
      return;
    }

    const defaultProfile = list.find((p) => p.isDefault);
    setActiveProfileState(defaultProfile ?? list[0]);
  }, [followedProfiles]);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await profilesApi.fetchProfiles();
      setProfiles(data);
      pickActive(data);
    } catch {
      setProfiles([]);
      setActiveProfileState(null);
    } finally {
      setIsLoading(false);
    }
  }, [pickActive]);

  useEffect(() => {
    if (user) {
      loadProfiles();
    } else {
      setProfiles([]);
      setActiveProfileState(null);
    }
  }, [user, loadProfiles]);

  const setActiveProfile = useCallback(
    (id: string) => {
      const profile = profiles.find((p) => p.id === id);
      if (profile) {
        setActiveProfileState(profile);
        localStorage.setItem(STORAGE_KEY, id);
        return;
      }
      const followed = followedProfiles.find((p) => p.id === id);
      if (followed) {
        setActiveProfileState(toFollowedProfile(followed));
        localStorage.setItem(STORAGE_KEY, id);
      }
    },
    [profiles, followedProfiles],
  );

  const createProfileFn = useCallback(
    async (input: { name: string; isPublic?: boolean }) => {
      const created = await profilesApi.createProfile(input);
      await loadProfiles();
      return created;
    },
    [loadProfiles],
  );

  const updateProfileFn = useCallback(
    async (id: string, data: { name?: string; isDefault?: boolean; isPublic?: boolean }) => {
      const updated = await profilesApi.updateProfile(id, data);
      feedCache.invalidate(id);
      await loadProfiles();
      return updated;
    },
    [loadProfiles, feedCache],
  );

  const deleteProfileFn = useCallback(
    async (id: string) => {
      await profilesApi.deleteProfile(id);
      feedCache.invalidate(id);
      if (activeProfile?.id === id) {
        localStorage.removeItem(STORAGE_KEY);
      }
      await loadProfiles();
    },
    [activeProfile, loadProfiles, feedCache],
  );

  return (
    <ProfileContext.Provider
      value={{
        profiles,
        activeProfile,
        isLoading,
        setActiveProfile,
        createProfile: createProfileFn,
        updateProfile: updateProfileFn,
        deleteProfile: deleteProfileFn,
        refreshProfiles: loadProfiles,
        followedProfiles,
        followedLoading,
        unfollowProfile: handleUnfollow,
        refreshFollowed,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfiles(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfiles must be used within a ProfileProvider');
  }
  return context;
}
