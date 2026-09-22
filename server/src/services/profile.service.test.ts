import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/prisma', () => ({
  default: {
    profile: { findFirst: vi.fn() },
  },
}));

import prisma from '../utils/prisma';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  assertProfileOwnership,
} from './profile.service';

const mockedFindFirst = vi.mocked(prisma.profile.findFirst);

describe('Error classes', () => {
  describe('NotFoundError', () => {
    it('has status 404 and default message', () => {
      const err = new NotFoundError();
      expect(err.status).toBe(404);
      expect(err.message).toBe('Not found');
      expect(err.name).toBe('NotFoundError');
    });

    it('accepts a custom message', () => {
      const err = new NotFoundError('Profile missing');
      expect(err.message).toBe('Profile missing');
    });

    it('is an instance of Error', () => {
      expect(new NotFoundError()).toBeInstanceOf(Error);
    });
  });

  describe('ConflictError', () => {
    it('has status 409 and default message', () => {
      const err = new ConflictError();
      expect(err.status).toBe(409);
      expect(err.message).toBe('Conflict');
      expect(err.name).toBe('ConflictError');
    });

    it('accepts a custom message', () => {
      const err = new ConflictError('Already exists');
      expect(err.message).toBe('Already exists');
    });

    it('is an instance of Error', () => {
      expect(new ConflictError()).toBeInstanceOf(Error);
    });
  });

  describe('BadRequestError', () => {
    it('has status 400 and default message', () => {
      const err = new BadRequestError();
      expect(err.status).toBe(400);
      expect(err.message).toBe('Bad request');
      expect(err.name).toBe('BadRequestError');
    });

    it('accepts a custom message', () => {
      const err = new BadRequestError('Invalid input');
      expect(err.message).toBe('Invalid input');
    });

    it('is an instance of Error', () => {
      expect(new BadRequestError()).toBeInstanceOf(Error);
    });
  });
});

describe('assertProfileOwnership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the profile when it belongs to the user', async () => {
    const mockProfile = { id: 'profile-1', userId: 'user-1', name: 'My Profile' };
    mockedFindFirst.mockResolvedValue(mockProfile as any);

    const result = await assertProfileOwnership('profile-1', 'user-1');

    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { id: 'profile-1', userId: 'user-1' },
    });
    expect(result).toEqual(mockProfile);
  });

  it('throws NotFoundError when profile is not found', async () => {
    mockedFindFirst.mockResolvedValue(null);

    await expect(assertProfileOwnership('profile-1', 'user-1')).rejects.toThrow(NotFoundError);
    await expect(assertProfileOwnership('profile-1', 'user-1')).rejects.toThrow('Profile not found');
  });
});
