import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import { env } from './config/env.js';
import gatewayRoutes from './routes/gatewayRoutes.js';

const app = express();

// Correlation ID Middleware
app.use((req, res, next) => {
  const reqId = req.headers['x-request-id'] || randomUUID();
  req.id = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Custom Logging with Request ID
morgan.token('id', (req) => req.id);
app.use(morgan(env.nodeEnv === 'development' ? ':id :method :url :status - :response-time ms' : 'combined'));

// CORS & Body Parsing Limits
app.use(cors({ origin: env.corsOrigin, credentials: true }));

app.use(gatewayRoutes);

export default app;
