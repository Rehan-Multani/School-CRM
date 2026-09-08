import { AppError } from '../../../shared/AppError.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

/**
 * Sub-role gate for transport manager/admin-only operations (create trip, cancel,
 * settings, alert/SOS resolution). Runs AFTER `requireTransport`. A SCHOOLADMIN
 * token always passes. Drivers/conductors are rejected 403.
 *
 * @param {string[]} allowed e.g. ['TRANSPORT_MANAGER','TRANSPORT_ADMIN']
 */
export function requireTransportRole(allowed = []) {
  const set = new Set(allowed.map((r) => String(r).toUpperCase()));
  return function requireTransportRoleMw(req, _res, next) {
    const role = (req.user?.role || '').toUpperCase();
    if (role === 'SCHOOLADMIN') return next();
    const sub = (req.user?.transportRole || '').toUpperCase();
    if (set.has(sub)) return next();
    next(new AppError('This action requires a transport manager or admin role', 403, TRANSPORT_ERR.TRANSPORT_ROLE_REQUIRED));
  };
}
