import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './config/errorHandler.js';
import platformRoutes from './routes/platformRoutes.js';
import { ensureUploadDirs, uploadsRoot } from './utils/upload.utils.js';

const app = express();

ensureUploadDirs();

app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(uploadsRoot));

app.use(platformRoutes);
app.use(errorHandler);

export default app;
