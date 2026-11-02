import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/prisma', () => ({
  default: {
    profile: { findMany: vi.fn(), count: vi.fn() },
  },
}));

import prisma from '../utils/prisma';
import { listPublicProfiles } from './community.service';

const mockedFindMany = vi.mocked(prisma.profile.findMany);
const mockedCount = vi.mocked(prisma.profile.count);

describe('listPublicProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only each profile\'s own channel names and available thumbnails', async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: 'profile-a',
        name: 'Profile A',
        userId: 'user-a',
        isPublic: true,
        user: { name: 'Alice', avatarUrl: null },
        _count: { followers: 0 },
        followers: [],
        channels: [
          { id: 'chan-1', channelTitle: 'Channel One', thumbnailUrl: 'https://example.com/1.jpg' },
        ],
      },
      {
        id: 'profile-b',
        name: 'Profile B',
        userId: 'user-b',
        isPublic: true,
        user: { name: 'Bob', avatarUrl: null },
        _count: { followers: 0 },
        followers: [],
        channels: [
          { id: 'chan-2', channelTitle: 'Channel Two', thumbnailUrl: null },
        ],
      },
    ] as any);
    mockedCount.mockResolvedValue(2);

    const result = await listPublicProfiles({ currentUserId: 'user-a' });

    expect(result.profiles).toHaveLength(2);
    expect(result.profiles[0].channels).toEqual([
      { id: 'chan-1', channelTitle: 'Channel One', thumbnailUrl: 'https://example.com/1.jpg' },
    ]);
    expect(result.profiles[1].channels).toEqual([
      { id: 'chan-2', channelTitle: 'Channel Two', thumbnailUrl: null },
    ]);
  });

  it('returns an empty list for a profile with zero channels', async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: 'profile-c',
        name: 'Profile C',
        userId: 'user-c',
        isPublic: true,
        user: { name: 'Cara', avatarUrl: null },
        _count: { followers: 0 },
        followers: [],
        channels: [],
      },
    ] as any);
    mockedCount.mockResolvedValue(1);

    const result = await listPublicProfiles({ currentUserId: 'user-a' });

    expect(result.profiles[0].channels).toEqual([]);
  });

  it('preserves keyword, pagination, ordering and follow-flag behavior unchanged', async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: 'profile-a',
        name: 'Profile A',
        userId: 'user-a',
        isPublic: true,
        user: { name: 'Alice', avatarUrl: null },
        _count: { followers: 3 },
        followers: [{ id: 'follow-1' }],
        channels: [],
      },
    ] as any);
    mockedCount.mockResolvedValue(1);

    const result = await listPublicProfiles({
      currentUserId: 'user-x',
      keyword: 'focus',
      page: 2,
      limit: 5,
    });

    expect(mockedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPublic: true,
          keywords: { some: { keyword: { contains: 'focus' } } },
        }),
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: expect.objectContaining({
          channels: { select: { id: true, channelTitle: true, thumbnailUrl: true } },
        }),
      }),
    );
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.total).toBe(1);
    expect(result.profiles[0].isFollowing).toBe(true);
    expect(result.profiles[0].isOwn).toBe(false);
  });
});
