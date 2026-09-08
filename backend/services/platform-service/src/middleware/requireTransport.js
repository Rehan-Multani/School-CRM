import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { enforceSubscriptionAccess } from './requireSubscription.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

/**
 * Transport APK auth guard. Verifies the Bearer JWT (role must be `TRANSPORT`,
 * or `SCHOOLADMIN` for oversight), sets `req.user`, then hands off to
 * `enforceSubscriptionAccess` (any cloned role middleware MUST call this or its
 * routes silently bypass the subscription gate).
 *
 * The token is minted by transportAuth.service.js from a `SchoolUser`
 * (`role:'TRANSPORT'`) and carries `transportRole`, `assignedVehicleId`,
 * `assignedRouteId`, `schoolId`. Nothing downstream trusts ids from the request.
 */
export function requireTransport(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new AppError('Authentication required', 401, TRANSPORT_ERR.UNAUTHORIZED);

    const payload = verifyToken(token, env.jwtSecret);
    const role = (payload.role || '').toUpperCase();
    if (role !== 'TRANSPORT' && role !== 'SCHOOLADMIN') {
      throw new AppError('Access denied: transport privileges required', 403, TRANSPORT_ERR.FORBIDDEN);
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
