import { Router, Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { authenticateJwt } from '../middleware/auth';
import { assertProfileOwnership, NotFoundError } from '../services/profile.service';

const router = Router();
router.use(authenticateJwt);

function p(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

// GET / - List profiles
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profiles = await prisma.profile.findMany({
      where: { userId: req.user!.id },
      include: { _count: { select: { channels: true, keywords: true, followers: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json(profiles);
  } catch (error) { next(error); }
});

// POST / - Create profile
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, isPublic } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'Name is required' }); return;
    }
    if (name.trim().length > 100) {
      res.status(400).json({ error: 'Name must be 100 characters or less' }); return;
    }
    if (isPublic !== undefined && typeof isPublic !== 'boolean') {
      res.status(400).json({ error: 'isPublic must be a boolean' }); return;
    }
    const profile = await prisma.profile.create({
      data: {
        name: name.trim(),
        userId: req.user!.id,
        isPublic: isPublic ?? false,
      },
    });
    res.status(201).json(profile);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'A profile with that name already exists' }); return;
    }
    next(error);
  }
});

// GET /:id - Get single profile
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req, 'id');
    const profile = await prisma.profile.findFirst({
      where: { id, userId: req.user!.id },
      include: { channels: true, keywords: true, _count: { select: { followers: true } } },
    });
    if (!profile) { res.status(404).json({ error: 'Profile not found' }); return; }
    res.json(profile);
  } catch (error) { next(error); }
});

// PUT /:id - Update profile
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req, 'id');
    const existing = await prisma.profile.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) { res.status(404).json({ error: 'Profile not found' }); return; }

    const { name, isDefault, isPublic } = req.body;
    const data: Prisma.ProfileUpdateInput = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Name is required' }); return;
      }
      if (name.trim().length > 100) {
        res.status(400).json({ error: 'Name must be 100 characters or less' }); return;
      }
      data.name = name.trim();
    }
    if (isDefault !== undefined) data.isDefault = Boolean(isDefault);
    if (isPublic !== undefined) {
      if (typeof isPublic !== 'boolean') {
        res.status(400).json({ error: 'isPublic must be a boolean' }); return;
      }
      data.isPublic = isPublic;
    }

    let profile;
    if (isDefault === true) {
      profile = await prisma.$transaction(async (tx) => {
        await tx.profile.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
        return tx.profile.update({ where: { id }, data });
      });
    } else {
      profile = await prisma.profile.update({ where: { id }, data });
    }
    res.json(profile);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'A profile with that name already exists' }); return;
    }
    next(error);
  }
});

// DELETE /:id - Delete profile
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req, 'id');
    const existing = await prisma.profile.findFirst({ where: { id, userId: req.user!.id } });
    if (!existing) { res.status(404).json({ error: 'Profile not found' }); return; }
    await prisma.profile.delete({ where: { id } });
    res.status(204).send();
  } catch (error) { next(error); }
});

// POST /:id/channels - Add channel
router.post('/:id/channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req, 'id');
    await assertProfileOwnership(id, req.user!.id);
    const { youtubeChannelId, channelTitle, thumbnailUrl } = req.body;
    if (!youtubeChannelId || typeof youtubeChannelId !== 'string') {
      res.status(400).json({ error: 'youtubeChannelId is required' }); return;
    }
    if (!channelTitle || typeof channelTitle !== 'string') {
      res.status(400).json({ error: 'channelTitle is required' }); return;
    }
    const channel = await prisma.profileChannel.create({
      data: { profileId: id, youtubeChannelId: youtubeChannelId.trim(), channelTitle: channelTitle.trim(), thumbnailUrl: thumbnailUrl ?? null },
    });
    res.status(201).json(channel);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Channel already exists in this profile' }); return;
    }
    if (error instanceof NotFoundError) { res.status(404).json({ error: error.message }); return; }
    next(error);
  }
});

// DELETE /:id/channels/:channelId - Remove channel
router.delete('/:id/channels/:channelId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req, 'id');
    const channelId = p(req, 'channelId');
    await assertProfileOwnership(id, req.user!.id);
    const channel = await prisma.profileChannel.findFirst({ where: { id: channelId, profileId: id } });
    if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }
    await prisma.profileChannel.delete({ where: { id: channelId } });
    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) { res.status(404).json({ error: error.message }); return; }
    next(error);
  }
});

// POST /:id/keywords - Add keyword
router.post('/:id/keywords', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req, 'id');
    await assertProfileOwnership(id, req.user!.id);
    const { keyword } = req.body;
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      res.status(400).json({ error: 'keyword is required' }); return;
    }
    const normalized = keyword.trim().toLowerCase();
    const kw = await prisma.profileKeyword.create({ data: { profileId: id, keyword: normalized } });
    res.status(201).json(kw);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Keyword already exists in this profile' }); return;
    }
    if (error instanceof NotFoundError) { res.status(404).json({ error: error.message }); return; }
    next(error);
  }
});

// DELETE /:id/keywords/:keywordId - Remove keyword
router.delete('/:id/keywords/:keywordId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req, 'id');
    const keywordId = p(req, 'keywordId');
    await assertProfileOwnership(id, req.user!.id);
    const kw = await prisma.profileKeyword.findFirst({ where: { id: keywordId, profileId: id } });
    if (!kw) { res.status(404).json({ error: 'Keyword not found' }); return; }
    await prisma.profileKeyword.delete({ where: { id: keywordId } });
    res.status(204).send();
  } catch (error) {
    if (error instanceof NotFoundError) { res.status(404).json({ error: error.message }); return; }
    next(error);
  }
});

export default router;
