import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import jsonwebtoken from 'jsonwebtoken';

vi.mock('./config', () => ({
  config: {
    JWT_SECRET: 'test-jwt-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
  },
}));

import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt';

describe('JWT utilities', () => {
  describe('access tokens', () => {
    it('sign and verify round-trip returns correct sub', () => {
      const token = signAccessToken('user-123');
      const result = verifyAccessToken(token);
      expect(result.sub).toBe('user-123');
    });

    it('verify throws with wrong secret', () => {
      const token = jsonwebtoken.sign({}, 'wrong-secret', {
        subject: 'user-123',
        expiresIn: '15m',
      });
      expect(() => verifyAccessToken(token)).toThrow();
    });

    it('verify throws with tampered token', () => {
      const token = signAccessToken('user-123');
      const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa');
      expect(() => verifyAccessToken(tampered)).toThrow();
    });
  });

  describe('refresh tokens', () => {
    it('sign and verify round-trip returns correct sub', () => {
      const token = signRefreshToken('user-456');
      const result = verifyRefreshToken(token);
      expect(result.sub).toBe('user-456');
    });

    it('access token cannot be verified as refresh token', () => {
      const token = signAccessToken('user-123');
      expect(() => verifyRefreshToken(token)).toThrow();
    });

    it('refresh token cannot be verified as access token', () => {
      const token = signRefreshToken('user-123');
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('token expiry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('access token expires after 15 minutes', () => {
      const now = new Date('2025-01-15T12:00:00Z');
      vi.setSystemTime(now);

      const token = signAccessToken('user-789');

      // Still valid at 14 minutes
      vi.setSystemTime(new Date('2025-01-15T12:14:00Z'));
      expect(() => verifyAccessToken(token)).not.toThrow();

      // Expired at 16 minutes
      vi.setSystemTime(new Date('2025-01-15T12:16:00Z'));
      expect(() => verifyAccessToken(token)).toThrow(
        expect.objectContaining({ name: 'TokenExpiredError' }),
      );
    });
  });
});
