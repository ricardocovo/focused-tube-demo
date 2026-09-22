import jwt from 'jsonwebtoken';
import { config } from './config';

export function signAccessToken(userId: string): string {
  return jwt.sign({}, config.JWT_SECRET, {
    subject: userId,
    expiresIn: '15m',
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({}, config.JWT_REFRESH_SECRET, {
    subject: userId,
    expiresIn: '30d',
  });
}

export function verifyAccessToken(token: string): { sub: string } {
  const payload = jwt.verify(token, config.JWT_SECRET) as jwt.JwtPayload;
  return { sub: payload.sub as string };
}

export function verifyRefreshToken(token: string): { sub: string } {
  const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  return { sub: payload.sub as string };
}
