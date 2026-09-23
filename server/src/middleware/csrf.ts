import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../utils/config';

const isProduction = config.NODE_ENV === 'production';

export const CSRF_COOKIE_NAME = 'ft_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

export const CSRF_COOKIE_OPTIONS = {
  // httpOnly: the value is handed to the client explicitly via the
  // GET /api/auth/csrf-token response body (see routes/auth.ts), so
  // client-side JS never needs to read this cookie directly. Reading it via
  // document.cookie would not work anyway in the cross-origin SWA/Container
  // App production deployment, since that cookie is scoped to the API's own
  // domain rather than the SPA's domain.
  httpOnly: true,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProduction,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// Issues a fresh double-submit CSRF cookie and returns the token value.
export function issueCsrfCookie(res: Response): string {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
  return token;
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    path: CSRF_COOKIE_OPTIONS.path,
    sameSite: CSRF_COOKIE_OPTIONS.sameSite,
    secure: CSRF_COOKIE_OPTIONS.secure,
  });
}

// Double-submit cookie CSRF protection: the client must first fetch the
// current token from GET /api/auth/csrf-token, then echo it back in a custom
// request header on state-changing requests. A cross-site attacker can cause
// the browser to send the httpOnly cookie automatically, but same-origin
// policy (enforced here via strict CORS) prevents them from ever reading the
// token value, so a mismatch indicates a forged request.
export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const csrfCookie = req.cookies?.ft_csrf_token;
  const csrfHeader = req.header(CSRF_HEADER_NAME);

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    res.status(403).json({ error: 'invalid_csrf_token' });
    return;
  }

  next();
}
