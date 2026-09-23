import { describe, it, expect, vi, afterEach } from 'vitest';
import axios from 'axios';
import { setAccessToken, getAccessToken, resetCsrfToken } from './api';
import api from './api';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

const mockedAxios = vi.mocked(axios, true);

describe('api module', () => {
  afterEach(() => {
    setAccessToken(null);
    resetCsrfToken();
    vi.clearAllMocks();
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
    function getInterceptor() {
      const handlers = (api.interceptors.request as unknown as { handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Promise<Record<string, unknown>> }> }).handlers;
      const interceptor = handlers.find((h) => h !== null && h.fulfilled);
      expect(interceptor).toBeDefined();
      return interceptor!.fulfilled;
    }

    it('adds Authorization header when token is set', async () => {
      setAccessToken('test-token');
      const fulfilled = getInterceptor();

      const mockConfig = { headers: {} as Record<string, string> };
      const result = (await fulfilled(mockConfig)) as typeof mockConfig;

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('does not add Authorization header when no token is set', async () => {
      setAccessToken(null);
      const fulfilled = getInterceptor();

      const mockConfig = { headers: {} as Record<string, string> };
      const result = (await fulfilled(mockConfig)) as typeof mockConfig;

      expect(result.headers.Authorization).toBeUndefined();
    });
  });

  describe('CSRF header injection', () => {
    function getInterceptor() {
      const handlers = (api.interceptors.request as unknown as { handlers: Array<{ fulfilled: (config: Record<string, unknown>) => Promise<Record<string, unknown>> }> }).handlers;
      const interceptor = handlers.find((h) => h !== null && h.fulfilled);
      expect(interceptor).toBeDefined();
      return interceptor!.fulfilled;
    }

    it('fetches and adds the CSRF header for /api/auth/refresh requests', async () => {
      mockedAxios.get.mockResolvedValue({ data: { csrfToken: 'abc123' } });
      const fulfilled = getInterceptor();

      const mockConfig = { url: '/api/auth/refresh', headers: {} as Record<string, string> };
      const result = (await fulfilled(mockConfig)) as typeof mockConfig;

      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('/api/auth/csrf-token'), { withCredentials: true });
      expect(result.headers['x-csrf-token']).toBe('abc123');
    });

    it('fetches and adds the CSRF header for /api/auth/logout requests', async () => {
      mockedAxios.get.mockResolvedValue({ data: { csrfToken: 'abc123' } });
      const fulfilled = getInterceptor();

      const mockConfig = { url: '/api/auth/logout', headers: {} as Record<string, string> };
      const result = (await fulfilled(mockConfig)) as typeof mockConfig;

      expect(result.headers['x-csrf-token']).toBe('abc123');
    });

    it('does not fetch or add the CSRF header for unrelated requests', async () => {
      const fulfilled = getInterceptor();

      const mockConfig = { url: '/api/profiles', headers: {} as Record<string, string> };
      const result = (await fulfilled(mockConfig)) as typeof mockConfig;

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(result.headers['x-csrf-token']).toBeUndefined();
    });

    it('caches the CSRF token across multiple requests', async () => {
      mockedAxios.get.mockResolvedValue({ data: { csrfToken: 'abc123' } });
      const fulfilled = getInterceptor();

      await fulfilled({ url: '/api/auth/refresh', headers: {} });
      await fulfilled({ url: '/api/auth/logout', headers: {} });

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('does not add the CSRF header when the fetch fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('network error'));
      const fulfilled = getInterceptor();

      const mockConfig = { url: '/api/auth/refresh', headers: {} as Record<string, string> };
      const result = (await fulfilled(mockConfig)) as typeof mockConfig;

      expect(result.headers['x-csrf-token']).toBeUndefined();
    });

    it('resetCsrfToken clears the cached token so it is refetched', async () => {
      mockedAxios.get.mockResolvedValue({ data: { csrfToken: 'abc123' } });
      const fulfilled = getInterceptor();

      await fulfilled({ url: '/api/auth/refresh', headers: {} });
      resetCsrfToken();
      await fulfilled({ url: '/api/auth/refresh', headers: {} });

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
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
