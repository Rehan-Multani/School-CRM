import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword,
  login,
  me,
  refresh,
  updateProfile,
} from '../controllers/auth.controller.js';
import { healthCheck } from '../controllers/health.controller.js';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

const router = Router();

router.get('/health', healthCheck);
router.post('/login', loginLimiter, login);
router.post('/refresh', refresh);
router.get('/me', requireSuperAdmin, me);
router.patch('/profile', requireSuperAdmin, updateProfile);
router.patch('/password', requireSuperAdmin, changePassword);

export default router;
