import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess, prefetchSubscriptionAccess } from './requireSubscription.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';
import { Driver } from '../models/Driver.js';

/**
 * Driver API auth guard. Verifies the Bearer JWT (role must be `DRIVER`), sets
 * `req.user`, then hands off to `enforceSubscriptionAccess` — any role
 * middleware that skips that call silently bypasses the subscription gate.
 *
 * The token is minted by driverAuth.service.js from a `Driver` and carries
 * `driverId` and `schoolId`. Nothing downstream trusts ids from the request:
 * the driver's route, vehicle and student list are all resolved from the token.
 */
// Revocation: `tv` must equal Driver.tokenVersion (bumped on password change,
// logout, account delete) and the driver must still be ACTIVE with login on.
export async function requireDriver(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new AppError('Authentication required', 401, TRANSPORT_ERR.UNAUTHORIZED);

    const payload = verifyToken(token, env.jwtSecret);
    if ((payload.role || '').toUpperCase() !== 'DRIVER') {
      throw new AppError('Access denied: driver privileges required', 403, TRANSPORT_ERR.FORBIDDEN);
    }

    // Subscription lookup runs alongside the account lookup, not after it.
    const gate = prefetchSubscriptionAccess(req, payload);
    const driver = await Driver.findOne({ _id: payload.driverId || payload.sub, schoolId: payload.schoolId })
      .select('status loginEnabled tokenVersion')
      .lean();
    if (!driver || (payload.tv ?? 0) !== (driver.tokenVersion ?? 0)) {
      throw new AppError('Session expired, please log in again', 401, TRANSPORT_ERR.UNAUTHORIZED);
    }
    if (driver.status !== 'ACTIVE' || !driver.loginEnabled) {
      throw new AppError('This driver account is not active. Contact your school office.', 401, TRANSPORT_ERR.DRIVER_INACTIVE);
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
