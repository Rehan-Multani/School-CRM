import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import { notFoundHandler, errorHandler } from './config/errorHandler.js';
import { securityHeaders } from '../../shared/securityHeaders.js';

const app = express();

app.set('trust proxy', 1);
app.use(securityHeaders({ isProd: env.nodeEnv === 'production' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '2mb' })); // 2mb covers a base64 avatar; not a file endpoint

app.use(authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
