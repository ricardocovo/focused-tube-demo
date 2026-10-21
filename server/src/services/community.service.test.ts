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

function row(overrides: Record<string, unknown>) {
  return {
    id: 'p',
    name: 'Profile',
    isPublic: true,
    userId: 'other-user',
    user: { name: 'Other', avatarUrl: null },
    _count: { followers: 0 },
    followers: [],
    channels: [],
    ...overrides,
  };
}

describe('listPublicProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes only each profile’s own channels with nullable thumbnails', async () => {
    mockedFindMany.mockResolvedValue([
      row({
        id: 'p1',
        channels: [{ id: 'c1', channelTitle: 'Alpha', thumbnailUrl: 'https://img/a.jpg' }],
      }),
      row({
        id: 'p2',
        channels: [{ id: 'c2', channelTitle: 'Beta', thumbnailUrl: null }],
      }),
    ] as never);
    mockedCount.mockResolvedValue(2);

    const result = await listPublicProfiles({ currentUserId: 'me' });

    expect(result.profiles[0].channels).toEqual([
      { id: 'c1', channelTitle: 'Alpha', thumbnailUrl: 'https://img/a.jpg' },
    ]);
    expect(result.profiles[1].channels).toEqual([
      { id: 'c2', channelTitle: 'Beta', thumbnailUrl: null },
    ]);
  });

  it('returns an empty channels list for a profile without channels', async () => {
    mockedFindMany.mockResolvedValue([row({ id: 'p1' })] as never);
    mockedCount.mockResolvedValue(1);

    const result = await listPublicProfiles({ currentUserId: 'me' });

    expect(result.profiles[0].channels).toEqual([]);
  });

  it('selects only needed channel fields and preserves filter, paging, order and follow flags', async () => {
    mockedFindMany.mockResolvedValue([
      row({ id: 'p1', userId: 'me', followers: [] }),
      row({ id: 'p2', followers: [{ id: 'f1' }] }),
    ] as never);
    mockedCount.mockResolvedValue(30);

    const result = await listPublicProfiles({ currentUserId: 'me', keyword: 'focus', page: 2, limit: 10 });

    const args = mockedFindMany.mock.calls[0][0]!;
    expect(args.where).toEqual({ isPublic: true, keywords: { some: { keyword: { contains: 'focus' } } } });
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
    expect(args.include?.channels).toEqual({ select: { id: true, channelTitle: true, thumbnailUrl: true } });
    expect(mockedCount).toHaveBeenCalledWith({ where: args.where });

    expect(result).toMatchObject({ total: 30, page: 2, limit: 10 });
    expect(result.profiles[0]).toMatchObject({ isOwn: true, isFollowing: false });
    expect(result.profiles[1]).toMatchObject({ isOwn: false, isFollowing: true });
    expect(result.profiles[1]).not.toHaveProperty('followers');
  });
});
