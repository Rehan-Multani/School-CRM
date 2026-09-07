import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess } from './requireSubscription.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

/**
 * Teacher APK auth guard — 6th independent school-tenant role middleware.
 *
 * Like requirePrincipal/requireHR/etc. it verifies its own Bearer JWT and role,
 * then hands off to enforceSubscriptionAccess (see the
 * subscription-access-control-gate note: any cloned role middleware MUST call
 * this, or its routes silently bypass the subscription gate).
 *
 * The token is minted by teacherAuth.service.js with role 'TEACHER' and both
 * `teacherId` and `schoolId` claims. Nothing here (or downstream) trusts a
 * schoolId/teacherId from the request body — utils/tenant.js re-derives them
 * from `req.user`.
 */
export function requireTeacher(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      throw new AppError('Authentication required', 401, TEACHER_ERR.UNAUTHORIZED);
    }

    const payload = verifyToken(token, env.jwtSecret);
    const role = (payload.role || '').toUpperCase();
    if (role !== 'TEACHER') {
      throw new AppError('Access denied: teacher privileges required', 403, TEACHER_ERR.FORBIDDEN);
    }

    req.user = payload;
    enforceSubscriptionAccess(req, res, next);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401, TEACHER_ERR.UNAUTHORIZED));
  }
}
