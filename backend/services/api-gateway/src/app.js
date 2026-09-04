import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import { env } from './config/env.js';
import gatewayRoutes from './routes/gatewayRoutes.js';
import { securityHeaders } from '../../shared/securityHeaders.js';

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeaders({ isProd: env.nodeEnv === 'production' }));

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

// P2: explicit CORS allowlist — no wildcard for an authenticated API. Requests
// with no Origin (curl, server-to-server, same-origin navigations) are allowed.
app.use(
  cors({
    origin(origin, cb) {
      // No Origin header (curl, native apps, same-origin) → allow.
      // Listed origin → allow. Anything else → no ACAO header, browser blocks it.
      cb(null, !origin || env.corsOrigins.includes(origin));
    },
    credentials: true,
  })
);

app.use(gatewayRoutes);

export default app;
