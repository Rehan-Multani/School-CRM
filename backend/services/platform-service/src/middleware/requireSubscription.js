import { AppError } from '../../../shared/AppError.js';
import { subscriptionAccessService } from '../services/subscriptionAccess.service.js';

function resolveSchoolId(req) {
  const role = (req.user?.role || '').toUpperCase();
  return role === 'SCHOOLADMIN' ? req.user?.sub : req.user?.schoolId;
}

// Endpoints that must stay reachable for every school regardless of
// subscription state — account/profile management, and (critically) the
// subscription/plan endpoints themselves. Without this list, an expired
// school could never see *why* it's blocked, nor pay to fix it, which would
// turn a recoverable "please renew" state into a permanent lockout.
// Matched by exact path or by path + "/" prefix (so a sibling route with the
// same leading characters, e.g. "/school-portal/me" vs a hypothetical
// "/school-portal/media", can never false-match).
const EXEMPT_PATHS = [
  '/school-portal/me',
  '/school-portal/notifications', // so a school can still see the "your subscription expired" notice
  '/school-portal/plans',
  '/school-portal/select-plan',
  '/school-portal/subscription',
  '/school-portal/config',
  '/school-portal/settings',
  '/school-portal/profile', // librarian's own profile route has no /librarian/ segment
  '/school-portal/principal/me',
  '/school-portal/principal/profile',
  '/school-portal/principal/password',
  '/school-portal/hr/profile',
  '/school-portal/hr/password',
  '/school-portal/accountant/profile',
  '/school-portal/accountant/password',
];

function isExemptPath(path) {
  return EXEMPT_PATHS.some((exempt) => path === exempt || path.startsWith(`${exempt}/`));
}

/**
 * Shared enforcement step called by every requireXxx role middleware
 * (requireSchoolAdmin, requirePrincipal, requireHR, requireLibrarian,
 * requireAccountant) right after req.user is set. Blocks with 402 once a
 * school's subscription has moved past its grace period into `expired` (or
 * its cancelled period has fully ended). Schools with no SchoolSubscription
 * record at all are never blocked — see subscriptionAccess.service.js for why.
 */
export async function enforceSubscriptionAccess(req, res, next) {
  try {
    if (isExemptPath(req.path)) return next();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return next(); // no tenant context on this route — nothing to gate
    const entitlement = await subscriptionAccessService.getEntitlement(schoolId);
    if (!entitlement.hasFullAccess) {
      throw new AppError('Your school’s subscription has expired. Please renew to continue.', 402);
    }
    req.subscriptionEntitlement = entitlement;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    next(new AppError('Unable to verify subscription status', 500));
  }
}

/**
 * Standalone route-level version of the same check, for any route that isn't
 * behind one of the requireXxx role middlewares above.
 */
export function requireSubscription() {
  return async function requireSubscriptionMw(req, res, next) {
    try {
      const schoolId = resolveSchoolId(req);
      if (!schoolId) return next(); // no tenant context on this route — nothing to gate
      const entitlement = await subscriptionAccessService.getEntitlement(schoolId);
      if (!entitlement.hasFullAccess) {
        throw new AppError('Your school’s subscription has expired. Please renew to continue.', 402);
      }
      req.subscriptionEntitlement = entitlement;
      next();
    } catch (error) {
      if (error instanceof AppError) return next(error);
      next(new AppError('Unable to verify subscription status', 500));
    }
  };
}

/** Same as requireSubscription(), plus the plan must explicitly include `feature`. */
export function requireFeature(feature) {
  return async function requireFeatureMw(req, res, next) {
    try {
      const schoolId = resolveSchoolId(req);
      if (!schoolId) return next();
      const entitlement = await subscriptionAccessService.getEntitlement(schoolId);
      if (!entitlement.hasFullAccess) {
        throw new AppError('Your school’s subscription has expired. Please renew to continue.', 402);
      }
      if (entitlement.features && !entitlement.features.includes(feature)) {
        throw new AppError(`Your current plan does not include "${feature}". Upgrade to unlock it.`, 402);
      }
      req.subscriptionEntitlement = entitlement;
      next();
    } catch (error) {
      if (error instanceof AppError) return next(error);
      next(new AppError('Unable to verify subscription status', 500));
    }
  };
}
