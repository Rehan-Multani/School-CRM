import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess } from './requireSubscription.js';
import { assertStaffAccountActive } from './staffAccount.js';

export async function requireAccountant(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(token, env.jwtSecret);
    const role = (payload.role || '').toUpperCase();
    if (role !== 'ACCOUNTANT' && role !== 'SCHOOLADMIN') {
      throw new AppError('Access denied: Accountant or School Admin privileges required', 403);
    }

    // A deleted or deactivated staff member loses access immediately.
    await assertStaffAccountActive(payload);

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
