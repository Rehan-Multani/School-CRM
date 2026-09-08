import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';

/**
 * Authenticates *any* platform role.
 *
 * The role-specific guards (requireTeacher, requireParent, …) each pin a single
 * role, which is right for role-scoped modules. A handful of endpoints are
 * genuinely shared by every signed-in user — the notification inbox and device
 * registration — and those were left with no guard at all, taking `role`,
 * `schoolId` and `userId` straight from the query string. This closes that gap
 * without inventing a per-role copy of each shared route.
 *
 * It authenticates only. Tenant scoping is the caller's job, using
 * `req.user.schoolId` — never a client-supplied value.
 */

/** JWT role claim -> DeviceToken role. Casing differs per issuing service. */
const JWT_ROLE_TO_DEVICE_ROLE = new Map([
  ['SCHOOLADMIN', 'school-admin'],
  ['PRINCIPAL', 'principal'],
  ['ACCOUNTANT', 'accountant'],
  ['TEACHER', 'teacher'],
  ['STUDENT', 'student'],
  ['PARENT', 'parent'],
  ['HR', 'hr'],
  ['LIBRARIAN', 'librarian'],
  ['TRANSPORT', 'transport'],
]);

export function deviceRoleForUser(user) {
  return JWT_ROLE_TO_DEVICE_ROLE.get(String(user?.role || '').toUpperCase()) || '';
}

export function requirePlatformUser(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const payload = verifyToken(token, env.jwtSecret);
    if (!payload?.role) {
      throw new AppError('Invalid token', 401);
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401));
  }
}
