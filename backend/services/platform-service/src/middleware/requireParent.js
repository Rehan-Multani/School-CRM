import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess } from './requireSubscription.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';

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
export function requireParent(req, res, next) {
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

    req.user = payload;
    enforceSubscriptionAccess(req, res, next);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401, PARENT_ERR.UNAUTHORIZED));
  }
}
