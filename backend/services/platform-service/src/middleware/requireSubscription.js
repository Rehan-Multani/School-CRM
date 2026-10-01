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
  // Teacher APK self-service — must stay reachable so a teacher at an expired
  // school can still authenticate and see the "subscription expired" reason.
  '/school-portal/teacher/auth',
  '/school-portal/teacher/me',
  '/school-portal/teacher/profile',
  '/school-portal/teacher/change-password',
  '/school-portal/teacher/account/delete', // deleting your account must never be paywalled
  // Student APK self-service — same rationale as the teacher paths above.
  '/school-portal/student/auth',
  '/school-portal/student/me',
  '/school-portal/student/profile',
  '/school-portal/student/change-password',
  '/school-portal/student/account/delete',
  // Parent APK self-service — same rationale.
  '/school-portal/parent/auth',
  '/school-portal/parent/me',
  '/school-portal/parent/profile',
  '/school-portal/parent/change-password',
  '/school-portal/parent/account/delete',
  // Driver API self-service — same rationale as the teacher paths above: a
  // driver at an expired school must still be able to sign in and be told why.
  '/school-portal/auth/driver-login',
  '/school-portal/driver/me',
  '/school-portal/driver/change-password',
  '/school-portal/driver/auth/logout',
  '/school-portal/driver/account/delete',
  // Transport Manager app self-service — same rationale.
  '/school-portal/transport-manager/auth',
  '/school-portal/transport-manager/me',
  '/school-portal/transport-manager/change-password',
  '/school-portal/transport-manager/account/delete',
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
 *
 * `prefetched` is the promise from prefetchSubscriptionAccess(), so a guard can
 * run this lookup in parallel with its own account lookup instead of after it.
 */
export async function enforceSubscriptionAccess(req, res, next, prefetched = null) {
  try {
    if (isExemptPath(req.path)) return next();
    const schoolId = resolveSchoolId(req);
    if (!schoolId) return next(); // no tenant context on this route — nothing to gate
    const entitlement = await (prefetched || subscriptionAccessService.getGateEntitlement(schoolId));
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
 * Starts the gate's lookup from a verified token payload before req.user is
 * set. Returns null when the path is exempt or has no tenant. The guard must
 * still pass the promise to enforceSubscriptionAccess — its own 401/403 checks
 * always win because they are evaluated first.
 */
export function prefetchSubscriptionAccess(req, payload) {
  if (isExemptPath(req.path)) return null;
  const schoolId = resolveSchoolId({ user: payload });
  if (!schoolId) return null;
  const promise = subscriptionAccessService.getGateEntitlement(schoolId);
  promise.catch(() => {}); // the guard may reject first; never leave this unhandled
  return promise;
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
