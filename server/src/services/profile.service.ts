import prisma from '../utils/prisma';

export class NotFoundError extends Error {
  status = 404;
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  status = 409;
  constructor(message = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends Error {
  status = 400;
  constructor(message = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

// Verify profile belongs to user, return profile or throw NotFoundError
export async function assertProfileOwnership(profileId: string, userId: string) {
  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId },
  });
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }
  return profile;
}
