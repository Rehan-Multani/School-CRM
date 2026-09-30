import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess, prefetchSubscriptionAccess } from './requireSubscription.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';
import { Teacher } from '../models/Teacher.js';

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
 *
 * Revocation: the token's `tv` claim must equal Teacher.tokenVersion (bumped on
 * password change/reset and logout), and the account must still be ACTIVE —
 * so a stolen or logged-out token, or a deactivated teacher, stops working
 * immediately instead of living out its 7-day expiry.
 */
export async function requireTeacher(req, res, next) {
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

    // Subscription lookup runs alongside the account lookup, not after it.
    const gate = prefetchSubscriptionAccess(req, payload);
    const teacher = await Teacher.findOne({ _id: payload.teacherId || payload.sub, schoolId: payload.schoolId })
      .select('status account.accountStatus tokenVersion')
      .lean();
    if (!teacher || (payload.tv ?? 0) !== (teacher.tokenVersion ?? 0)) {
      throw new AppError('Session expired, please log in again', 401, TEACHER_ERR.UNAUTHORIZED);
    }
    const acct = teacher.account?.accountStatus || '';
    if (teacher.status !== 'ACTIVE' || (acct && acct !== 'ACTIVE')) {
      throw new AppError('This teacher account is not active. Contact your school office.', 401, TEACHER_ERR.TEACHER_INACTIVE);
    }

    req.user = payload;
    enforceSubscriptionAccess(req, res, next, gate);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401, TEACHER_ERR.UNAUTHORIZED));
  }
}
