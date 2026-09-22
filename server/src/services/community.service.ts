import prisma from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { NotFoundError, ConflictError, BadRequestError } from './profile.service';

export async function listPublicProfiles(params: {
  currentUserId: string;
  keyword?: string;
  page?: number;
  limit?: number;
}): Promise<{ profiles: any[]; total: number; page: number; limit: number }> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  const where: Prisma.ProfileWhereInput = {
    isPublic: true,
  };

  if (params.keyword) {
    where.keywords = { some: { keyword: { contains: params.keyword } } };
  }

  const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      include: {
        user: { select: { name: true, avatarUrl: true } },
        _count: { select: { followers: true } },
        followers: {
          where: { followerId: params.currentUserId },
          select: { id: true },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.profile.count({ where }),
  ]);

  const mapped = profiles.map(({ followers, ...rest }) => ({
    ...rest,
    isFollowing: followers.length > 0,
    isOwn: rest.userId === params.currentUserId,
  }));

  return { profiles: mapped, total, page, limit };
}

export async function followProfile(followerId: string, profileId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile || !profile.isPublic) {
    throw new NotFoundError('Profile not found');
  }
  if (profile.userId === followerId) {
    throw new BadRequestError('Cannot follow your own profile');
  }

  try {
    return await prisma.profileFollow.create({
      data: { followerId, profileId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('Already following this profile');
    }
    throw error;
  }
}

export async function unfollowProfile(followerId: string, profileId: string): Promise<void> {
  const existing = await prisma.profileFollow.findUnique({
    where: { followerId_profileId: { followerId, profileId } },
  });
  if (!existing) {
    throw new NotFoundError('Not following this profile');
  }
  await prisma.profileFollow.delete({ where: { id: existing.id } });
}

export async function listFollowedProfiles(userId: string) {
  const follows = await prisma.profileFollow.findMany({
    where: { followerId: userId },
    include: {
      profile: {
        include: {
          user: { select: { name: true, avatarUrl: true } },
          _count: { select: { followers: true } },
        },
      },
    },
  });

  return follows.map((f) => ({
    ...f.profile,
    isFollowing: true,
  }));
}
