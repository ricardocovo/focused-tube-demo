import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

const CSRF_HEADER_NAME = 'x-csrf-token';

let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

// Fetches (and caches) the double-submit CSRF token from the server. The
// token is bound to an httpOnly cookie the server can verify but the client
// cannot read directly (necessary since the API and SPA are on different
// origins in production), so it must be fetched explicitly via this
// read-only endpoint before it can be echoed back as a header.
async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) {
    return csrfToken;
  }
  if (!csrfTokenPromise) {
    csrfTokenPromise = axios
      .get(`${import.meta.env.VITE_API_URL ?? ''}/api/auth/csrf-token`, { withCredentials: true })
      .then(({ data }) => {
        csrfToken = data.csrfToken ?? null;
        return csrfToken;
      })
      .catch(() => null)
      .finally(() => {
        csrfTokenPromise = null;
      });
  }
  return csrfTokenPromise;
}

export function resetCsrfToken(): void {
  csrfToken = null;
}

// Routes that authenticate via the httpOnly refresh cookie need the CSRF
// token echoed back as a header to guard against cross-site request forgery.
const CSRF_PROTECTED_PATHS = ['/api/auth/refresh', '/api/auth/logout'];

api.interceptors.request.use(async (config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (config.url && CSRF_PROTECTED_PATHS.some((path) => config.url!.includes(path))) {
    const token = await ensureCsrfToken();
    if (token) {
      config.headers[CSRF_HEADER_NAME] = token;
    }
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry refresh for non-401, already-retried requests, or the refresh endpoint itself
    const isRefreshRequest = originalRequest?.url?.includes('/api/auth/refresh');
    if (error.response?.status !== 401 || originalRequest._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => {
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshCsrfToken = await ensureCsrfToken();
      const { data } = await axios.post(`${import.meta.env.VITE_API_URL ?? ''}/api/auth/refresh`, null, {
        withCredentials: true,
        headers: refreshCsrfToken ? { [CSRF_HEADER_NAME]: refreshCsrfToken } : undefined,
      });
      setAccessToken(data.accessToken);
      processQueue(null);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      setAccessToken(null);
      processQueue(refreshError);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
