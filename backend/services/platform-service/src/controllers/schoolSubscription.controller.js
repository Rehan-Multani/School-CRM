import { schoolSubscriptionService } from '../services/schoolSubscription.service.js';
import { razorpaySubscriptionService } from '../services/razorpaySubscription.service.js';
import { subscriptionAccessService } from '../services/subscriptionAccess.service.js';
import { AppError } from '../../../shared/AppError.js';

function actorFrom(req, source) {
  return { name: req.user?.name || req.user?.email || 'System', role: req.user?.role, source, req };
}

// ==========================================================================
// Super Admin — explicit school selection, full control
// ==========================================================================

export async function createSchoolSubscription(req, res, next) {
  try {
    const { schoolId } = req.params;
    const result = await schoolSubscriptionService.create(schoolId, req.body, actorFrom(req, 'super_admin'));
    res.status(201).json({ success: true, data: result, message: 'Subscription created' });
  } catch (error) {
    next(error);
  }
}

export async function listSchoolSubscriptions(req, res, next) {
  try {
    const result = await schoolSubscriptionService.list(req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionStats(req, res, next) {
  try {
    const data = await schoolSubscriptionService.stats();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSchoolSubscriptionById(req, res, next) {
  try {
    const data = await schoolSubscriptionService.getPublic(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function cancelSchoolSubscription(req, res, next) {
  try {
    const data = await schoolSubscriptionService.cancel(
      req.params.id,
      { immediate: req.body?.immediate === true, reason: req.body?.reason },
      actorFrom(req, 'super_admin')
    );
    res.json({ success: true, data, message: req.body?.immediate ? 'Subscription cancelled immediately' : 'Cancellation scheduled for period end' });
  } catch (error) {
    next(error);
  }
}

export async function changeSchoolSubscriptionPlan(req, res, next) {
  try {
    const data = await schoolSubscriptionService.changePlan(req.params.id, { newPlanId: req.body?.planId }, actorFrom(req, 'super_admin'));
    res.json({ success: true, data, message: 'Plan change processed' });
  } catch (error) {
    next(error);
  }
}

export async function overrideSchoolSubscription(req, res, next) {
  try {
    const data = await schoolSubscriptionService.adminOverride(req.params.id, req.body, actorFrom(req, 'super_admin'));
    res.json({ success: true, data, message: 'Override applied' });
  } catch (error) {
    next(error);
  }
}

export async function listSubscriptionPayments(req, res, next) {
  try {
    const result = await schoolSubscriptionService.listPayments(req.params.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listSubscriptionInvoices(req, res, next) {
  try {
    const result = await schoolSubscriptionService.listInvoices(req.params.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listSubscriptionHistory(req, res, next) {
  try {
    const result = await schoolSubscriptionService.listHistory(req.params.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ==========================================================================
// School Admin — schoolId ALWAYS derived from the JWT, never the request body.
// ==========================================================================

function schoolAdminSchoolId(req) {
  const role = (req.user?.role || '').toUpperCase();
  if (role !== 'SCHOOLADMIN') throw new AppError('School Admin access required', 403);
  const id = req.user?.sub;
  if (!id) throw new AppError('School context missing on this session', 401);
  return id;
}

export async function getMySubscription(req, res, next) {
  try {
    const data = await schoolSubscriptionService.getForSchool(schoolAdminSchoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getMyEntitlement(req, res, next) {
  try {
    const schoolId = schoolAdminSchoolId(req);
    const entitlement = await subscriptionAccessService.getEntitlement(schoolId);
    res.json({
      success: true,
      data: {
        state: entitlement.state,
        hasFullAccess: entitlement.hasFullAccess,
        features: entitlement.features,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function checkoutMySubscription(req, res, next) {
  try {
    const schoolId = schoolAdminSchoolId(req);
    const result = await schoolSubscriptionService.checkoutForSchool(schoolId, { planId: req.body?.planId }, actorFrom(req, 'school_admin'));
    res.status(201).json({ success: true, data: result, message: 'Subscription checkout created' });
  } catch (error) {
    next(error);
  }
}

export async function changeMySubscriptionPlan(req, res, next) {
  try {
    const mySchoolId = schoolAdminSchoolId(req);
    const mine = await schoolSubscriptionService.getForSchool(mySchoolId);
    if (!mine) throw new AppError('No subscription found for this school', 404);
    const data = await schoolSubscriptionService.changePlan(mine.id, { newPlanId: req.body?.planId }, actorFrom(req, 'school_admin'));
    res.json({ success: true, data, message: 'Plan change processed' });
  } catch (error) {
    next(error);
  }
}

export async function cancelMySubscription(req, res, next) {
  try {
    const mySchoolId = schoolAdminSchoolId(req);
    const mine = await schoolSubscriptionService.getForSchool(mySchoolId);
    if (!mine) throw new AppError('No subscription found for this school', 404);
    // School Admin may only cancel at period end — immediate cancellation is Super Admin only.
    const data = await schoolSubscriptionService.cancel(mine.id, { immediate: false, reason: req.body?.reason }, actorFrom(req, 'school_admin'));
    res.json({ success: true, data, message: 'Your subscription will remain active until the end of the current billing period' });
  } catch (error) {
    next(error);
  }
}

export async function listMySubscriptionPayments(req, res, next) {
  try {
    const mySchoolId = schoolAdminSchoolId(req);
    const mine = await schoolSubscriptionService.getForSchool(mySchoolId);
    if (!mine) return res.json({ success: true, data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 1 } });
    const result = await schoolSubscriptionService.listPayments(mine.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listMySubscriptionInvoices(req, res, next) {
  try {
    const mySchoolId = schoolAdminSchoolId(req);
    const mine = await schoolSubscriptionService.getForSchool(mySchoolId);
    if (!mine) return res.json({ success: true, data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 1 } });
    const result = await schoolSubscriptionService.listInvoices(mine.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listMySubscriptionHistory(req, res, next) {
  try {
    const mySchoolId = schoolAdminSchoolId(req);
    const mine = await schoolSubscriptionService.getForSchool(mySchoolId);
    if (!mine) return res.json({ success: true, data: [], pagination: { page: 1, limit: 25, total: 0, totalPages: 1 } });
    const result = await schoolSubscriptionService.listHistory(mine.id, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionCheckoutInfo(req, res, next) {
  try {
    res.json({
      success: true,
      data: {
        configured: razorpaySubscriptionService.isConfigured(),
        keyId: razorpaySubscriptionService.publicKeyId(),
      },
    });
  } catch (error) {
    next(error);
  }
}
