import express from 'express';
import cookieParser from 'cookie-parser';
import * as path from 'path';
import * as fs from 'fs';
import { config } from './config';
import { authRouter } from './routes/auth';
import { coursesRouter } from './routes/courses';
import { modulesRouter } from './routes/modules';
import { lessonsRouter } from './routes/lessons';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ ok: true, env: config.nodeEnv });
});

app.use('/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/modules', modulesRouter);
app.use('/api/lessons', lessonsRouter);

if (config.isProd) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^\/(?!api|auth|health).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
    logger.info(`Serving SPA from ${clientDist}`);
  } else {
    logger.warn(`Client build not found at ${clientDist} — SPA will not be served`);
  }
}

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Server listening on http://localhost:${config.port} (${config.nodeEnv})`);
});
