import { prisma } from '../utils/prisma';
import { encrypt } from '../utils/encryption';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
}

export async function upsertUser(googleProfile: GoogleProfile, googleTokens: GoogleTokens) {
  const encryptedAccessToken = encrypt(googleTokens.accessToken);

  const updateData: Record<string, string | undefined> = {
    email: googleProfile.email,
    name: googleProfile.name,
    avatarUrl: googleProfile.avatarUrl,
    accessToken: encryptedAccessToken,
  };

  if (googleTokens.refreshToken) {
    updateData.refreshToken = encrypt(googleTokens.refreshToken);
  }

  const user = await prisma.user.upsert({
    where: { googleId: googleProfile.googleId },
    update: updateData,
    create: {
      googleId: googleProfile.googleId,
      email: googleProfile.email,
      name: googleProfile.name,
      avatarUrl: googleProfile.avatarUrl,
      accessToken: encryptedAccessToken,
      refreshToken: googleTokens.refreshToken ? encrypt(googleTokens.refreshToken) : '',
    },
  });

  return user;
}
