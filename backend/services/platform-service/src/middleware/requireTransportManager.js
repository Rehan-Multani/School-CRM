import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess, prefetchSubscriptionAccess } from './requireSubscription.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';
import { SchoolUser } from '../models/SchoolUser.js';

/**
 * Transport Manager app auth guard. Verifies the Bearer JWT (role must be
 * `TRANSPORT`), sets `req.user`, then hands off to `enforceSubscriptionAccess`
 * — any role middleware that skips that call silently bypasses the
 * subscription gate.
 *
 * The token is minted by transportManagerAuth.service.js from a `SchoolUser`
 * with role TRANSPORT. Nothing downstream trusts ids from the request: the
 * school every route, vehicle and student is read from comes from the token.
 */
// Revocation: `tv` must equal SchoolUser.tokenVersion (bumped on password
// change, logout, account delete) and the staff account must still be ACTIVE.
export async function requireTransportManager(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new AppError('Authentication required', 401, TRANSPORT_ERR.UNAUTHORIZED);

    const payload = verifyToken(token, env.jwtSecret);
    if ((payload.role || '').toUpperCase() !== 'TRANSPORT') {
      throw new AppError('Access denied: transport manager privileges required', 403, TRANSPORT_ERR.FORBIDDEN);
    }

    // Subscription lookup runs alongside the account lookup, not after it.
    const gate = prefetchSubscriptionAccess(req, payload);
    const user = await SchoolUser.findOne({ _id: payload.userId || payload.sub, schoolId: payload.schoolId, role: 'TRANSPORT' })
      .select('status tokenVersion')
      .lean();
    if (!user || (payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new AppError('Session expired, please log in again', 401, TRANSPORT_ERR.UNAUTHORIZED);
    }
    if (user.status !== 'ACTIVE') {
      throw new AppError(
        'This transport manager account is not active. Contact your school office.',
        401,
        TRANSPORT_ERR.MANAGER_INACTIVE
      );
    }

    req.user = payload;
    enforceSubscriptionAccess(req, res, next, gate);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401, TRANSPORT_ERR.UNAUTHORIZED));
  }
}
