import { describe, expect, it } from 'vitest';
import express from 'express';
import { createApiRateLimiter } from './rateLimit';

describe('createApiRateLimiter', () => {
  it('rejects requests after the configured limit', async () => {
    const app = express();
    app.use(createApiRateLimiter({ limit: 2, windowMs: 60_000 }));
    app.get('/', (_req, res) => res.json({ ok: true }));

    const server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));

    try {
      const address = server.address();
      if (!address || typeof address === 'string') {
        throw new Error('Test server did not bind to a TCP port');
      }

      const url = `http://127.0.0.1:${address.port}`;
      const responses = await Promise.all([fetch(url), fetch(url), fetch(url)]);

      expect(responses.map(({ status }) => status)).toEqual([200, 200, 429]);
      await expect(responses[2].json()).resolves.toEqual({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Please try again later.',
      });
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
