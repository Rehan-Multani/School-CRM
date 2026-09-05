import { AppError } from '../../../shared/AppError.js';
import { subscriptionAccessService } from '../services/subscriptionAccess.service.js';

function resolveSchoolId(req) {
  const role = (req.user?.role || '').toUpperCase();
  return role === 'SCHOOLADMIN' ? req.user?.sub : req.user?.schoolId;
}

/**
 * Blocks the request once a school's subscription has moved past its grace
 * period into `expired` (or its cancelled period has fully ended). Schools
 * with no SchoolSubscription record at all are never blocked here — see
 * subscriptionAccess.service.js for why.
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
