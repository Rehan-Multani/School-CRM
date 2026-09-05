import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess } from './requireSubscription.js';

export function requireSchoolAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(token, env.jwtSecret);
    if (payload.role !== 'SchoolAdmin') {
      throw new AppError('Forbidden', 403);
    }

    req.user = payload;
    enforceSubscriptionAccess(req, res, next);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError('Invalid or expired token', 401));
  }
}
