import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils/errors';
import { customizeCV } from '../services/claude';
import { getJobPosting, saveCustomizedCV } from '../services/db';
import { ParsedCV } from '../types';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { job_posting_id, cv_parsed } = req.body as {
    job_posting_id?: string;
    cv_parsed?: ParsedCV;
  };

  if (!job_posting_id) {
    throw new AppError('job_posting_id is required', 400);
  }
  if (!cv_parsed || !cv_parsed.name || !cv_parsed.experience) {
    throw new AppError('cv_parsed with name and experience is required', 400);
  }

  logger.info('Customize Route', `Customizing CV for job: ${job_posting_id}`);

  const jobPosting = await getJobPosting(job_posting_id);
  const customizedContent = await customizeCV(cv_parsed, jobPosting);

  const saved = await saveCustomizedCV(job_posting_id, cv_parsed, customizedContent);

  res.json({
    customized_cv_id: saved.id,
    customized_content: customizedContent,
    created_at: saved.created_at,
  });
}));

export default router;
