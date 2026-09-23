import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction } from 'express';
import { issueCsrfCookie, clearCsrfCookie, verifyCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './csrf';

describe('csrf middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = { cookies: {}, header: vi.fn() };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn(), cookie: vi.fn(), clearCookie: vi.fn() };
    mockNext = vi.fn() as unknown as NextFunction;
  });

  describe('issueCsrfCookie', () => {
    it('sets a cookie and returns a non-empty token', () => {
      const token = issueCsrfCookie(mockRes);

      expect(token).toEqual(expect.any(String));
      expect(token.length).toBeGreaterThan(0);
      expect(mockRes.cookie).toHaveBeenCalledWith(CSRF_COOKIE_NAME, token, expect.objectContaining({ httpOnly: true }));
    });

    it('generates a different token on each call', () => {
      const first = issueCsrfCookie(mockRes);
      const second = issueCsrfCookie(mockRes);

      expect(first).not.toBe(second);
    });
  });

  describe('clearCsrfCookie', () => {
    it('clears the csrf cookie', () => {
      clearCsrfCookie(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith(CSRF_COOKIE_NAME, expect.objectContaining({ path: '/api/auth' }));
    });
  });

  describe('verifyCsrfToken', () => {
    it('calls next when the header matches the cookie', () => {
      mockReq.cookies[CSRF_COOKIE_NAME] = 'matching-token';
      mockReq.header.mockReturnValue('matching-token');

      verifyCsrfToken(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('returns 403 when the header is missing', () => {
      mockReq.cookies[CSRF_COOKIE_NAME] = 'cookie-token';
      mockReq.header.mockReturnValue(undefined);

      verifyCsrfToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'invalid_csrf_token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 403 when the cookie is missing', () => {
      mockReq.header.mockReturnValue('header-token');

      verifyCsrfToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'invalid_csrf_token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 403 when the header does not match the cookie', () => {
      mockReq.cookies[CSRF_COOKIE_NAME] = 'cookie-token';
      mockReq.header.mockReturnValue('different-token');

      verifyCsrfToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'invalid_csrf_token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 403 when tokens have different lengths', () => {
      mockReq.cookies[CSRF_COOKIE_NAME] = 'short';
      mockReq.header.mockReturnValue('much-longer-token-value');

      verifyCsrfToken(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('uses the configured header name', () => {
      mockReq.cookies[CSRF_COOKIE_NAME] = 'token';
      mockReq.header.mockReturnValue('token');

      verifyCsrfToken(mockReq, mockRes, mockNext);

      expect(mockReq.header).toHaveBeenCalledWith(CSRF_HEADER_NAME);
    });
  });
});
