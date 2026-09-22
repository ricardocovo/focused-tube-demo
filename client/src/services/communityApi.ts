import api from './api';
import type { CommunityProfile, CommunityProfilesResponse, Profile } from '../types/profile';

export async function fetchCommunityProfiles(
  params?: { keyword?: string; page?: number; limit?: number },
): Promise<CommunityProfilesResponse> {
  const { data } = await api.get('/api/community/profiles', { params });
  return data;
}

export async function followProfile(profileId: string): Promise<void> {
  await api.post(`/api/community/profiles/${profileId}/follow`);
}

export async function unfollowProfile(profileId: string): Promise<void> {
  await api.delete(`/api/community/profiles/${profileId}/follow`);
}

export async function fetchFollowedProfiles(): Promise<CommunityProfile[]> {
  const { data } = await api.get('/api/community/following');
  return data;
}
