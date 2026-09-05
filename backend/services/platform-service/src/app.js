import express from 'express';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler } from './config/errorHandler.js';
import platformRoutes from './routes/platformRoutes.js';
import { ensureUploadDirs, uploadsRoot } from './utils/upload.utils.js';
import { requireUploadAccess } from './middleware/requireUploadAccess.js';
import { securityHeaders } from '../../shared/securityHeaders.js';
import { receiveRazorpayWebhook } from './controllers/razorpayWebhook.controller.js';

const app = express();

ensureUploadDirs();

const isProd = env.nodeEnv === 'production';

app.set('trust proxy', 1);
app.use(securityHeaders({ isProd }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// P2: mutations are the abuse surface (brute force, enumeration, duplicate
// financial writes). Generous for reads, tight for writes; login routes keep
// their own stricter limiter.
const mutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300, // per IP/min — headroom for legit bulk actions; schools may share a NAT IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' },
});
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  return mutationLimiter(req, res, next);
});

// Razorpay webhook: MUST see the exact raw bytes for HMAC signature
// verification, so it is mounted with express.raw() before the global
// express.json() below (which would otherwise re-serialize the body and
// break every signature check). No auth guard — Razorpay calls this
// server-to-server; the signature check IS the authentication.
app.post('/webhooks/razorpay', express.raw({ type: '*/*', limit: '1mb' }), receiveRazorpayWebhook);

// P2: 5mb JSON on every route was a payload-DoS surface. Real uploads use
// multipart/multer and are unaffected; 1mb is ample for any form/base64 avatar.
app.use(express.json({ limit: '1mb' }));

// P0: uploaded files are no longer world-readable. A valid platform JWT is
// required (header or ?t= query param — see requireUploadAccess / assetUrl()).
app.use(
  '/uploads',
  requireUploadAccess,
  express.static(uploadsRoot, {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Cache-Control', 'private, max-age=300');
    },
  })
);

app.use(platformRoutes);
app.use(errorHandler);

export default app;
