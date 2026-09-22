import { Request, Response, NextFunction } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';

export function authenticateJwt(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(401).json({ error: 'Unauthorized' });
  }
}
