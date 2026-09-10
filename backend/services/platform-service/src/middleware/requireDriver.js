import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess } from './requireSubscription.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

/**
 * Driver API auth guard. Verifies the Bearer JWT (role must be `DRIVER`), sets
 * `req.user`, then hands off to `enforceSubscriptionAccess` — any role
 * middleware that skips that call silently bypasses the subscription gate.
 *
 * The token is minted by driverAuth.service.js from a `Driver` and carries
 * `driverId` and `schoolId`. Nothing downstream trusts ids from the request:
 * the driver's route, vehicle and student list are all resolved from the token.
 */
export function requireDriver(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new AppError('Authentication required', 401, TRANSPORT_ERR.UNAUTHORIZED);

    const payload = verifyToken(token, env.jwtSecret);
    if ((payload.role || '').toUpperCase() !== 'DRIVER') {
      throw new AppError('Access denied: driver privileges required', 403, TRANSPORT_ERR.FORBIDDEN);
    }

    req.user = payload;
    enforceSubscriptionAccess(req, res, next);
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401, TRANSPORT_ERR.UNAUTHORIZED));
  }
}
