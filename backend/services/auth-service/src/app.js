import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import { notFoundHandler, errorHandler } from './config/errorHandler.js';

const app = express();

app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '5mb' }));

app.use(authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
