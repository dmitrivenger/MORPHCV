import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/errors';
import { getHistory } from '../services/db';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
  const offset = parseInt(req.query.offset as string || '0', 10);

  const { items, total } = await getHistory(limit, offset);

  res.json({ total, limit, offset, items });
}));

export default router;
