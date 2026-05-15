import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils/errors';
import { sanitizeText } from '../utils/validators';
import { parseCVWithClaude } from '../services/claude';
import { logger } from '../utils/logger';

const router = Router();

router.post('/parse', asyncHandler(async (req: Request, res: Response) => {
  const { raw_text } = req.body as { raw_text?: string };

  if (!raw_text || raw_text.trim().length < 50) {
    throw new AppError('CV text is too short or missing', 400);
  }

  const sanitized = sanitizeText(raw_text, 10000);
  logger.info('CV Route', `Parsing CV (${sanitized.length} chars)`);

  const parsed = await parseCVWithClaude(sanitized);

  res.json(parsed);
}));

export default router;
