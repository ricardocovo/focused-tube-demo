import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJwt } from '../middleware/auth';
import { listPublicProfiles, followProfile, unfollowProfile, listFollowedProfiles } from '../services/community.service';
import { NotFoundError, ConflictError, BadRequestError } from '../services/profile.service';

const router = Router();
router.use(authenticateJwt);

function p(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

// GET /profiles - List public profiles
router.get('/profiles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keyword = req.query.keyword as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

    const result = await listPublicProfiles({
      currentUserId: req.user!.id,
      keyword,
      page,
      limit,
    });
    res.json(result);
  } catch (error) { next(error); }
});

// POST /profiles/:profileId/follow - Follow a profile
router.post('/profiles/:profileId/follow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const follow = await followProfile(req.user!.id, p(req, 'profileId'));
    res.status(201).json(follow);
  } catch (error) {
    if (error instanceof NotFoundError) { res.status(404).json({ error: error.message }); return; }
    if (error instanceof BadRequestError) { res.status(400).json({ error: error.message }); return; }
    if (error instanceof ConflictError) { res.status(409).json({ error: error.message }); return; }
    next(error);
  }
});

// DELETE /profiles/:profileId/follow - Unfollow a profile
router.delete('/profiles/:profileId/follow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await unfollowProfile(req.user!.id, p(req, 'profileId'));
    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) { res.status(404).json({ error: error.message }); return; }
    next(error);
  }
});

// GET /following - List profiles the user follows
router.get('/following', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await listFollowedProfiles(req.user!.id);
    res.json(profiles);
  } catch (error) { next(error); }
});

export default router;
