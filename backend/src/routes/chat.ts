import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../utils/errors';
import { refineCVWithStream, extractUpdatedCV } from '../services/claude';
import { getCustomizedCV, getChatHistory, saveChatMessage, updateCustomizedCV } from '../services/db';
import { logger } from '../utils/logger';

const router = Router();

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { customized_cv_id, user_message } = req.body as {
    customized_cv_id?: string;
    user_message?: string;
  };

  if (!customized_cv_id) {
    throw new AppError('customized_cv_id is required', 400);
  }
  if (!user_message || user_message.trim().length === 0) {
    throw new AppError('user_message is required', 400);
  }

  logger.info('Chat Route', `Refining CV: ${customized_cv_id}`);

  const customizedCV = await getCustomizedCV(customized_cv_id);
  const chatHistory = await getChatHistory(customized_cv_id, 5);

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Save user message
  await saveChatMessage(customized_cv_id, 'user', user_message);

  const { fullResponse, tokensUsed } = await refineCVWithStream(
    customizedCV.customized_content,
    user_message,
    chatHistory,
    res
  );

  // Extract updated CV if present
  const updatedCV = extractUpdatedCV(fullResponse);
  if (updatedCV) {
    await updateCustomizedCV(customized_cv_id, updatedCV);
    res.write(`data: ${JSON.stringify({ type: 'cv_updated', content: updatedCV })}\n\n`);
  }

  // Save assistant message
  await saveChatMessage(customized_cv_id, 'assistant', fullResponse, tokensUsed);

  res.end();
}));

export default router;
