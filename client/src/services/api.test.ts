import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAccessToken, getAccessToken } from './api';
import api from './api';

describe('api module', () => {
  afterEach(() => {
    setAccessToken(null);
  });

  describe('setAccessToken / getAccessToken', () => {
    it('stores and retrieves a token', () => {
      setAccessToken('my-token');
      expect(getAccessToken()).toBe('my-token');
    });

    it('returns null when no token is set', () => {
      expect(getAccessToken()).toBeNull();
    });

    it('clears the token when set to null', () => {
      setAccessToken('my-token');
      setAccessToken(null);
      expect(getAccessToken()).toBeNull();
    });

    it('overwrites previous token with a new value', () => {
      setAccessToken('first-token');
      setAccessToken('second-token');
      expect(getAccessToken()).toBe('second-token');
    });
  });

  describe('request interceptor', () => {
    it('adds Authorization header when token is set', async () => {
      setAccessToken('test-token');

      const handlers = (api.interceptors.request as unknown as { handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }> }).handlers;
      const interceptor = handlers.find((h) => h !== null && h.fulfilled);

      expect(interceptor).toBeDefined();

      const mockConfig = { headers: {} as Record<string, string> };
      const result = interceptor!.fulfilled(mockConfig) as typeof mockConfig;

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('does not add Authorization header when no token is set', () => {
      setAccessToken(null);

      const handlers = (api.interceptors.request as unknown as { handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Record<string, unknown> }> }).handlers;
      const interceptor = handlers.find((h) => h !== null && h.fulfilled);

      expect(interceptor).toBeDefined();

      const mockConfig = { headers: {} as Record<string, string> };
      const result = interceptor!.fulfilled(mockConfig) as typeof mockConfig;

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('api instance configuration', () => {
    it('is an axios instance with withCredentials enabled', () => {
      expect(api.defaults.withCredentials).toBe(true);
    });

    it('defaults baseURL to empty string when VITE_API_URL is not set', () => {
      expect(api.defaults.baseURL).toBe('');
    });
  });
});
