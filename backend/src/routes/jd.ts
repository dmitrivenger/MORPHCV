import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils/errors';
import { validateUrl, sanitizeText } from '../utils/validators';
import { scrapeJobUrl } from '../services/scraper';
import { parseJDWithClaude } from '../services/claude';
import { saveJobPosting } from '../services/db';
import { logger } from '../utils/logger';

const router = Router();

router.post('/fetch', asyncHandler(async (req: Request, res: Response) => {
  const { url, raw_text } = req.body as { url?: string; raw_text?: string };

  if (!url && !raw_text) {
    throw new AppError('Provide either a URL or raw job description text', 400);
  }

  let rawJd: string;

  if (url) {
    if (!validateUrl(url)) {
      throw new AppError('Invalid URL format', 400);
    }
    logger.info('JD Route', `Fetching JD from URL: ${url}`);
    rawJd = await scrapeJobUrl(url);
  } else {
    rawJd = sanitizeText(raw_text!, 20000);
  }

  if (rawJd.length < 50) {
    throw new AppError('Job description content is too short. Please check the URL or paste the text.', 422);
  }

  logger.info('JD Route', `Parsing JD with Claude (${rawJd.length} chars)`);
  const parsedJson = await parseJDWithClaude(rawJd);

  const jobPosting = await saveJobPosting(rawJd, parsedJson, url);

  res.json(jobPosting);
}));

export default router;
