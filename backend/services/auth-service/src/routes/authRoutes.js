import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  changePassword,
  login,
  logout,
  me,
  refresh,
  requestLoginOtp,
  resendLoginOtp,
  updateProfile,
  verifyLoginOtp,
} from '../controllers/auth.controller.js';
import { healthCheck } from '../controllers/health.controller.js';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  // The suite signs in dozens of times from one IP; the limiter itself is not
  // what those tests exercise.
  skip: () => process.env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

const router = Router();

router.get('/health', healthCheck);
router.post('/login', loginLimiter, login);
router.post('/login/request-otp', loginLimiter, requestLoginOtp);
router.post('/login/verify-otp', loginLimiter, verifyLoginOtp);
router.post('/login/resend-otp', loginLimiter, resendLoginOtp);
// Rate limited too: /refresh is an unauthenticated endpoint that accepts a
// bearer-equivalent credential, so it deserves the same brute-force budget.
router.post('/refresh', loginLimiter, refresh);
router.post('/logout', requireSuperAdmin, logout);
router.get('/me', requireSuperAdmin, me);
router.patch('/profile', requireSuperAdmin, updateProfile);
router.patch('/password', requireSuperAdmin, changePassword);

export default router;
