import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess } from './requireSubscription.js';
import { assertStaffAccountActive } from './staffAccount.js';

export async function requirePrincipal(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(token, env.jwtSecret);
    // The School Admin panel shares these routes with the Principal panel
    // (dashboard, students, users, exams, timetable, …), so both roles pass.
    const role = (payload.role || '').toUpperCase();
    if (role !== 'PRINCIPAL' && role !== 'SCHOOLADMIN') {
      throw new AppError('Access denied: Principal or School Admin privileges required', 403);
    }

    // A deleted or deactivated staff member loses access immediately.
    await assertStaffAccountActive(payload);

    req.user = payload;
    // A School Admin token carries the school in `sub`; a Principal's in `schoolId`.
    req.schoolId = role === 'SCHOOLADMIN' ? payload.sub || payload.schoolId : payload.schoolId || payload.sub;
    enforceSubscriptionAccess(req, res, next);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError('Invalid or expired token', 401));
  }
}
