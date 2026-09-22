import { Router } from 'express';
import { quotaTracker } from '../utils/quota';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    quota: quotaTracker.getUsage(),
  });
});

export default router;
