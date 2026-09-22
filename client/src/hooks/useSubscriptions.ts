import { useState, useEffect, useCallback, useRef } from 'react';
import type { SubscriptionChannel } from '../types/youtube';
import { fetchSubscriptions } from '../services/subscriptionsApi';

export function useSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchSubscriptions();
      setSubscriptions(data);
    } catch {
      setError('Failed to load subscriptions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    load();
  }, [load]);

  const refetch = useCallback(() => {
    hasFetched.current = true;
    return load();
  }, [load]);

  return { subscriptions, isLoading, error, refetch };
}
