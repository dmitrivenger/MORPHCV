import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils/errors';
import { getCustomizedCV } from '../services/db';
import { generatePDF } from '../services/pdf';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { customized_cv_id } = req.body as { customized_cv_id?: string };

  if (!customized_cv_id) {
    throw new AppError('customized_cv_id is required', 400);
  }

  logger.info('Export Route', `Generating PDF for: ${customized_cv_id}`);

  const customizedCV = await getCustomizedCV(customized_cv_id);
  const pdfBuffer = await generatePDF(customizedCV.customized_content);

  const cvData = customizedCV.original_cv_json as { name?: string };
  const name = cvData?.name?.replace(/\s+/g, '_') || 'CV';
  const filename = `${name}_Customized_CV.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);

  res.send(pdfBuffer);
}));

export default router;
