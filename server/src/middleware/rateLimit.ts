import { rateLimit, type Options } from 'express-rate-limit';

type RateLimitOverrides = Partial<Pick<Options, 'limit' | 'windowMs'>>;

export function createApiRateLimiter(overrides: RateLimitOverrides = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'rate_limit_exceeded', message: 'Too many requests. Please try again later.' },
    ...overrides,
  });
}

export const apiRateLimiter = createApiRateLimiter();
