import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from './fetchWithRetry';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns the value on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');

    const promise = fetchWithRetry(fn);
    const result = await promise;

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on server error and returns value on eventual success', async () => {
    const serverError = { response: { status: 500 }, message: 'Server Error' };
    const fn = vi.fn()
      .mockImplementationOnce(() => { throw serverError; })
      .mockImplementationOnce(() => { throw serverError; })
      .mockResolvedValueOnce('recovered');

    const promise = fetchWithRetry(fn, 3, 100);

    // First retry delay: 100 * 2^0 = 100ms
    await vi.advanceTimersByTimeAsync(100);
    // Second retry delay: 100 * 2^1 = 200ms
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry on 4xx client errors', async () => {
    const clientError = { response: { status: 400 }, message: 'Bad Request' };
    const fn = vi.fn().mockImplementation(() => { throw clientError; });

    await expect(fetchWithRetry(fn)).rejects.toBe(clientError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does not retry on 404 errors', async () => {
    const notFound = { response: { status: 404 }, message: 'Not Found' };
    const fn = vi.fn().mockImplementation(() => { throw notFound; });

    await expect(fetchWithRetry(fn)).rejects.toBe(notFound);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws the last error after exhausting all retries', async () => {
    const serverError = { response: { status: 500 }, message: 'Server Error' };
    const fn = vi.fn().mockRejectedValue(serverError);

    const promise = fetchWithRetry(fn, 3, 100);
    const assertion = expect(promise).rejects.toBe(serverError);

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(400);

    await assertion;
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('uses exponential backoff delays', async () => {
    const error = { response: { status: 500 } };
    const fn = vi.fn().mockRejectedValue(error);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = fetchWithRetry(fn, 3, 100);
    const handled = promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(400);
    await handled;

    // With Math.random() mocked to 0, delays are exactly baseDelay * 2^attempt
    const delayCalls = setTimeoutSpy.mock.calls
      .map((call) => call[1])
      .filter((delay): delay is number => typeof delay === 'number' && delay >= 100);

    expect(delayCalls).toEqual([100, 200, 400]);
  });

  it('respects custom retries parameter', async () => {
    const error = { response: { status: 500 } };
    const fn = vi.fn().mockRejectedValue(error);

    const promise = fetchWithRetry(fn, 1, 100);
    const handled = promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(100);
    await handled;

    expect(fn).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
  });

  it('respects custom baseDelay parameter', async () => {
    const error = { response: { status: 500 } };
    const fn = vi.fn().mockRejectedValue(error);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    const promise = fetchWithRetry(fn, 1, 500);
    const handled = promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(500);
    await handled;

    const delayCalls = setTimeoutSpy.mock.calls
      .map((call) => call[1])
      .filter((delay): delay is number => typeof delay === 'number' && delay >= 500);

    expect(delayCalls).toEqual([500]);
  });

  it('retries errors without a response status (e.g. network errors)', async () => {
    const networkError = new Error('Network failure');
    const fn = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('ok');

    const promise = fetchWithRetry(fn, 2, 100);

    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
