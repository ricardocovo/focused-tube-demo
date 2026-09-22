import api from './api';
import type { Profile, ProfileChannel, ProfileKeyword } from '../types/profile';

export async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await api.get('/api/profiles');
  return data;
}

export async function fetchProfile(id: string): Promise<Profile> {
  const { data } = await api.get(`/api/profiles/${id}`);
  return data;
}

export async function createProfile(input: { name: string; isPublic?: boolean }): Promise<Profile> {
  const { data } = await api.post('/api/profiles', input);
  return data;
}

export async function updateProfile(
  id: string,
  updates: { name?: string; isDefault?: boolean; isPublic?: boolean },
): Promise<Profile> {
  const { data } = await api.put(`/api/profiles/${id}`, updates);
  return data;
}

export async function deleteProfile(id: string): Promise<void> {
  await api.delete(`/api/profiles/${id}`);
}

export async function addChannel(
  profileId: string,
  channel: { youtubeChannelId: string; channelTitle: string; thumbnailUrl?: string | null },
): Promise<ProfileChannel> {
  const { data } = await api.post(`/api/profiles/${profileId}/channels`, channel);
  return data;
}

export async function removeChannel(profileId: string, channelId: string): Promise<void> {
  await api.delete(`/api/profiles/${profileId}/channels/${channelId}`);
}

export async function addKeyword(profileId: string, keyword: string): Promise<ProfileKeyword> {
  const { data } = await api.post(`/api/profiles/${profileId}/keywords`, { keyword });
  return data;
}

export async function removeKeyword(profileId: string, keywordId: string): Promise<void> {
  await api.delete(`/api/profiles/${profileId}/keywords/${keywordId}`);
}
