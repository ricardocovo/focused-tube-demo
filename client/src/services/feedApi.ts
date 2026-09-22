import api from './api';
import { FeedResponse } from '../types/feed';
import { fetchWithRetry } from '../lib/fetchWithRetry';

export async function fetchFeed(
  profileId: string,
  params?: { source?: string; pageToken?: string },
): Promise<FeedResponse> {
  return fetchWithRetry(async () => {
    const { data } = await api.get<FeedResponse>(`/api/feed/${profileId}`, { params });
    return data;
  });
}
