import express from 'express';
import cors from 'cors';
import { config, validateEnv } from './src/config/env';
import { errorHandler } from './src/utils/errors';
import { logger } from './src/utils/logger';

import jdRoutes from './src/routes/jd';
import cvRoutes from './src/routes/cv';
import customizeRoutes from './src/routes/customize';
import chatRoutes from './src/routes/chat';
import exportRoutes from './src/routes/export';
import historyRoutes from './src/routes/history';

validateEnv();

const app = express();

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

app.use('/api/jd', jdRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/customize', customizeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/export-pdf', exportRoutes);
app.use('/api/history', historyRoutes);

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info('Server', `MorphCV API running on http://localhost:${config.port}`);
  logger.info('Server', `Environment: ${config.nodeEnv}`);
});

export default app;
