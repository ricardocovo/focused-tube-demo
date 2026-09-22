import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  DATABASE_URL: requireEnv('DATABASE_URL'),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // These are required in Phase 2+ but optional during Phase 1
  get GOOGLE_CLIENT_ID() { return requireEnv('GOOGLE_CLIENT_ID'); },
  get GOOGLE_CLIENT_SECRET() { return requireEnv('GOOGLE_CLIENT_SECRET'); },
  get GOOGLE_CALLBACK_URL() { return process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'; },
  get JWT_SECRET() { return requireEnv('JWT_SECRET'); },
  get JWT_REFRESH_SECRET() { return requireEnv('JWT_REFRESH_SECRET'); },
  get ENCRYPTION_KEY() { return requireEnv('ENCRYPTION_KEY'); },

  // Cache settings
  CACHE_MAX_ENTRIES: parseInt(process.env.CACHE_MAX_ENTRIES || '5000', 10),
  CACHE_TTL_CHANNEL_SECONDS: parseInt(process.env.CACHE_TTL_CHANNEL_SECONDS || '600', 10),
  CACHE_TTL_KEYWORD_SECONDS: parseInt(process.env.CACHE_TTL_KEYWORD_SECONDS || '300', 10),

  // Feed settings
  FEED_PUBLISHED_AFTER_DAYS: parseInt(process.env.FEED_PUBLISHED_AFTER_DAYS || '14', 10),

  // Quota settings
  QUOTA_DAILY_LIMIT: parseInt(process.env.QUOTA_DAILY_LIMIT || '9000', 10),
};
