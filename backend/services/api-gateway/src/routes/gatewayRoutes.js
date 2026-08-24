import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  authProxy,
  healthCheck,
  readyCheck,
  notFound,
  platformProxy,
} from '../controllers/gateway.controller.js';

const router = Router();

// Gateway Rate Limiter (Prevent API abuse / DDoS)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // 1000 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

// Health Checks
router.get('/health', healthCheck);
router.get('/ready', readyCheck);
router.get('/api/health', healthCheck);
router.get('/api/ready', readyCheck);

// Proxies
router.use('/api/v1/platform/auth', generalLimiter, authProxy);
router.use('/api/v1/platform', generalLimiter, platformProxy);
router.use(notFound);

export default router;
