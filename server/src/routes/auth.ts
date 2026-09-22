import { Router, Request, Response, NextFunction } from 'express';
import passport from '../config/passport';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { authenticateJwt } from '../middleware/auth';
import { config } from '../utils/config';
import prisma from '../utils/prisma';

const router = Router();

const isProduction = config.NODE_ENV === 'production';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  // Cross-origin deployment (SWA + Container App): SameSite=None;Secure is required
  // so the browser sends the cookie on cross-origin POST requests from the SPA.
  // In development (same-site localhost), Lax is sufficient and avoids the Secure requirement.
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  secure: isProduction,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// GET /api/auth/google — redirect to Google OAuth consent screen
router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  const authOptions: Record<string, unknown> = {
    session: false,
    scope: ['profile', 'email', 'https://www.googleapis.com/auth/youtube.readonly'],
    accessType: 'offline',
    prompt: 'consent',
  };

  passport.authenticate('google', authOptions)(req, res, next);
});

// GET /api/auth/google/callback — handle OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${config.CLIENT_ORIGIN}/login?error=oauth_failed` }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    console.log('[auth callback] user present:', !!user, 'id:', user?.id);

    if (!user || !user.id) {
      console.warn('[auth callback] no user or id — redirecting to login');
      res.redirect(`${config.CLIENT_ORIGIN}/login?error=auth_failed`);
      return;
    }

    console.log('[auth callback] accessToken truthy:', !!user.accessToken, 'refreshToken truthy:', !!user.refreshToken);
    if (!user.accessToken || !user.refreshToken) {
      console.warn('[auth callback] missing YouTube credentials — redirecting to login');
      res.redirect(`${config.CLIENT_ORIGIN}/login?error=youtube_credentials_missing`);
      return;
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    // Set refresh token as httpOnly cookie
    res.cookie('ft_refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    // Set short-lived access token cookie for initial handoff
    res.cookie('ft_access_token', accessToken, {
      httpOnly: true,
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
      path: '/',
      maxAge: 60 * 1000, // 60 seconds
    });

    res.redirect(config.CLIENT_ORIGIN);
  }
);

// GET /api/auth/me — get current user
router.get('/me', authenticateJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout — clear session
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('ft_refresh_token', {
    path: '/api/auth',
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  });
  res.clearCookie('ft_access_token', {
    path: '/',
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction,
  });
  res.json({ message: 'Logged out' });
});

// POST /api/auth/refresh — rotate refresh token and issue new access token
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies?.ft_refresh_token;
  console.log('[auth refresh] cookie present:', !!token, '| cookies keys:', Object.keys(req.cookies || {}));

  if (!token) {
    res.status(401).json({ error: 'No refresh token' });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    console.log('[auth refresh] token verified, sub:', payload.sub);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const newAccessToken = signAccessToken(user.id);
    const newRefreshToken = signRefreshToken(user.id);

    res.cookie('ft_refresh_token', newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({ accessToken: newAccessToken });
  } catch {
    res.clearCookie('ft_refresh_token', {
      path: '/api/auth',
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    });
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

export default router;
