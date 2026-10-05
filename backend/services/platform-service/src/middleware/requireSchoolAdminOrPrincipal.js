import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess } from './requireSubscription.js';
import { assertStaffAccountActive } from './staffAccount.js';

// Shared gate for school-portal academic routes (years/classes/sections/subjects/
// teachers) that both School Admin and Principal manage from the same UI and the
// same endpoint. Token payload shape differs per role — schoolId resolves to
// whichever field that role's token actually carries.
export async function requireSchoolAdminOrPrincipal(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(token, env.jwtSecret);
    if (payload.role !== 'SchoolAdmin' && payload.role !== 'Principal') {
      throw new AppError('Access denied: School Admin or Principal privileges required', 403);
    }

    // A deleted or deactivated staff member loses access immediately.
    await assertStaffAccountActive(payload);

    req.user = payload;
    req.schoolId = payload.role === 'SchoolAdmin' ? payload.sub || payload.schoolId : payload.schoolId || payload.sub;
    enforceSubscriptionAccess(req, res, next);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(new AppError('Invalid or expired token', 401));
  }
}
