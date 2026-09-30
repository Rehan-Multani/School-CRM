import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess, prefetchSubscriptionAccess } from './requireSubscription.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';
import { Student } from '../models/Student.js';

/**
 * Student APK auth guard — 7th independent school-tenant role middleware.
 *
 * Like requireTeacher/requirePrincipal/etc. it verifies its own Bearer JWT and
 * role, then hands off to enforceSubscriptionAccess (see the
 * subscription-access-control-gate note: any cloned role middleware MUST call
 * this, or its routes silently bypass the subscription gate).
 *
 * The token is minted by studentAuth.service.js with role 'STUDENT' and both
 * `studentId` and `schoolId` claims. Nothing here (or downstream) trusts a
 * schoolId/studentId from the request body — utils/tenant.js re-derives them
 * from `req.user`.
 *
 * Revocation: the token's `tv` claim must equal Student.tokenVersion (bumped on
 * password change/reset and logout), and the student + login must still be
 * ACTIVE — so a stolen or logged-out token, or a deactivated student, stops
 * working immediately instead of living out its 7-day expiry.
 */
export async function requireStudent(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      throw new AppError('Authentication required', 401, STUDENT_ERR.UNAUTHORIZED);
    }

    const payload = verifyToken(token, env.jwtSecret);
    const role = (payload.role || '').toUpperCase();
    if (role !== 'STUDENT') {
      throw new AppError('Access denied: student privileges required', 403, STUDENT_ERR.FORBIDDEN);
    }

    // Subscription lookup runs alongside the account lookup, not after it.
    const gate = prefetchSubscriptionAccess(req, payload);
    const student = await Student.findOne({ _id: payload.studentId || payload.sub, schoolId: payload.schoolId })
      .select('status account.accountStatus tokenVersion')
      .lean();
    if (!student || (payload.tv ?? 0) !== (student.tokenVersion ?? 0)) {
      throw new AppError('Session expired, please log in again', 401, STUDENT_ERR.UNAUTHORIZED);
    }
    const acct = student.account?.accountStatus || '';
    if ((student.status && student.status !== 'ACTIVE') || (acct && acct !== 'ACTIVE')) {
      throw new AppError('This student account is not active. Contact your school office.', 401, STUDENT_ERR.STUDENT_INACTIVE);
    }

    req.user = payload;
    enforceSubscriptionAccess(req, res, next, gate);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401, STUDENT_ERR.UNAUTHORIZED));
  }
}
