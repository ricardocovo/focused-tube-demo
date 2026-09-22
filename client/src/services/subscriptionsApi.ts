import api from './api';
import type { SubscriptionChannel } from '../types/youtube';
import { fetchWithRetry } from '../lib/fetchWithRetry';

export async function fetchSubscriptions(): Promise<SubscriptionChannel[]> {
  return fetchWithRetry(async () => {
    const { data } = await api.get<SubscriptionChannel[]>('/api/subscriptions');
    return data;
  });
}
