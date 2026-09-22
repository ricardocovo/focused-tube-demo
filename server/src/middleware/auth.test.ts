import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';

vi.mock('../utils/jwt', () => ({
  verifyAccessToken: vi.fn(),
}));

import { authenticateJwt } from './auth';
import { verifyAccessToken } from '../utils/jwt';

const mockedVerify = vi.mocked(verifyAccessToken);

describe('authenticateJwt', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { headers: {} };
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    mockNext = vi.fn() as unknown as NextFunction;
  });

  it('returns 401 when Authorization header is missing', () => {
    authenticateJwt(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header lacks Bearer prefix', () => {
    mockReq.headers.authorization = 'Basic some-token';

    authenticateJwt(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('calls next and sets req.user when token is valid', () => {
    mockReq.headers.authorization = 'Bearer valid-token';
    mockedVerify.mockReturnValue({ sub: 'user-123' } as any);

    authenticateJwt(mockReq, mockRes, mockNext);

    expect(mockedVerify).toHaveBeenCalledWith('valid-token');
    expect(mockReq.user).toEqual({ id: 'user-123' });
    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('returns 401 with "Token expired" when token is expired', () => {
    mockReq.headers.authorization = 'Bearer expired-token';
    mockedVerify.mockImplementation(() => {
      throw new TokenExpiredError('expired', new Date());
    });

    authenticateJwt(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token expired' });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('returns 401 with "Unauthorized" when token is invalid', () => {
    mockReq.headers.authorization = 'Bearer bad-token';
    mockedVerify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    authenticateJwt(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
