import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../utils/prisma', () => ({
  default: {
    profile: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import prisma from '../utils/prisma';
import { listPublicProfiles } from './community.service';

const mockedFindMany = vi.mocked(prisma.profile.findMany);
const mockedCount = vi.mocked(prisma.profile.count);

describe('listPublicProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCount.mockResolvedValue(1);
  });

  it('returns public profiles with only channel ids and titles', async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: 'profile-1',
        name: 'Deep Work',
        userId: 'user-1',
        isPublic: true,
        channels: [
          { id: 'channel-1', channelTitle: 'Focus Lab' },
          { id: 'channel-2', channelTitle: 'Quiet Coding' },
        ],
        user: { name: 'Casey', avatarUrl: null },
        _count: { followers: 2 },
        followers: [{ id: 'follow-1' }],
      },
    ] as never);

    const result = await listPublicProfiles({ currentUserId: 'user-1' });

    expect(mockedFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isPublic: true },
      include: expect.objectContaining({
        channels: { select: { id: true, channelTitle: true } },
      }),
    }));
    expect(mockedCount).toHaveBeenCalledWith({ where: { isPublic: true } });
    expect(result.profiles[0]).toMatchObject({
      channels: [
        { id: 'channel-1', channelTitle: 'Focus Lab' },
        { id: 'channel-2', channelTitle: 'Quiet Coding' },
      ],
      isFollowing: true,
      isOwn: true,
    });
  });

  it('preserves empty channel lists and excludes private profiles at the query boundary', async () => {
    mockedFindMany.mockResolvedValue([
      {
        id: 'profile-2',
        name: 'Empty',
        userId: 'user-2',
        isPublic: true,
        channels: [],
        user: { name: 'Jordan', avatarUrl: null },
        _count: { followers: 0 },
        followers: [],
      },
    ] as never);

    const result = await listPublicProfiles({
      currentUserId: 'user-1',
      keyword: 'focus',
      page: 2,
      limit: 10,
    });

    expect(mockedFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isPublic: true,
        keywords: { some: { keyword: { contains: 'focus' } } },
      },
      skip: 10,
      take: 10,
    }));
    expect(result.profiles[0].channels).toEqual([]);
  });
});
