export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 100,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const status = (error as { response?: { status?: number } })?.response?.status;
      // Don't retry client errors (4xx)
      if (status && status >= 400 && status < 500) throw error;
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 50;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
