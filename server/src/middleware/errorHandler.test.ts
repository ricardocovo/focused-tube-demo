import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction } from 'express';
import { errorHandler } from './errorHandler';

describe('errorHandler', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: NextFunction;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = {};
    mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    mockNext = vi.fn() as unknown as NextFunction;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('responds with custom status and error message', () => {
    const err = Object.assign(new Error('Resource not found'), { status: 404 });

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Resource not found' });
  });

  it('defaults to 500 when error has no status', () => {
    const err = new Error('Something broke');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Something broke' });
  });

  it('defaults to "Internal Server Error" when error has no message', () => {
    const err = Object.assign(new Error(''), { status: 500 });

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  it('logs the error stack via console.error', () => {
    const err = new Error('test error');

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledWith(err.stack);
  });

  it('logs the error message when stack is unavailable', () => {
    const err = new Error('no stack');
    err.stack = undefined;

    errorHandler(err, mockReq, mockRes, mockNext);

    expect(consoleErrorSpy).toHaveBeenCalledWith('no stack');
  });
});
