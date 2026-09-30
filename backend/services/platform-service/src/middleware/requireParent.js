import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess, prefetchSubscriptionAccess } from './requireSubscription.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';
import { Parent } from '../models/Parent.js';

/**
 * Parent APK auth guard — 8th independent school-tenant role middleware.
 *
 * Verifies its own Bearer JWT (`role` must be exactly `PARENT`), sets `req.user`,
 * then hands off to enforceSubscriptionAccess (any cloned role middleware MUST
 * call this or its routes silently bypass the subscription gate).
 *
 * The token is minted by parentAuth.service.js with `role: 'PARENT'`, `parentId`
 * and `schoolId` claims. Nothing downstream trusts a schoolId/parentId/childId
 * from the request — utils/tenant.js + parentAccess.service.js re-derive them.
 */
// Revocation: `tv` must equal Parent.tokenVersion (bumped on password change,
// logout, account delete) and the parent + login must still be ACTIVE.
export async function requireParent(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      throw new AppError('Authentication required', 401, PARENT_ERR.UNAUTHORIZED);
    }

    const payload = verifyToken(token, env.jwtSecret);
    const role = (payload.role || '').toUpperCase();
    if (role !== 'PARENT') {
      throw new AppError('Access denied: parent privileges required', 403, PARENT_ERR.FORBIDDEN);
    }

    // Subscription lookup runs alongside the account lookup, not after it.
    const gate = prefetchSubscriptionAccess(req, payload);
    const parent = await Parent.findOne({ _id: payload.parentId || payload.sub, schoolId: payload.schoolId })
      .select('status account.accountStatus tokenVersion')
      .lean();
    if (!parent || (payload.tv ?? 0) !== (parent.tokenVersion ?? 0)) {
      throw new AppError('Session expired, please log in again', 401, PARENT_ERR.UNAUTHORIZED);
    }
    const acct = parent.account?.accountStatus || '';
    if ((parent.status && parent.status !== 'ACTIVE') || (acct && acct !== 'ACTIVE')) {
      throw new AppError('This parent account is not active. Contact your school office.', 401, PARENT_ERR.PARENT_INACTIVE);
    }

    req.user = payload;
    enforceSubscriptionAccess(req, res, next, gate);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401, PARENT_ERR.UNAUTHORIZED));
  }
}
