import { AppError } from '../../../shared/AppError.js';
import { schoolSubscriptionRepository } from '../repositories/schoolSubscription.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { School } from '../models/School.js';
import { ACTIVE_LIKE_STATUSES } from '../models/SchoolSubscription.js';
import { razorpaySubscriptionService } from './razorpaySubscription.service.js';
import { notificationService } from './notification.service.js';
import { auditLogService } from './auditLog.service.js';
import { mapPlanTypeToInterval } from './subscription.service.js';

const GRACE_PERIOD_DAYS = 3; // TODO: make per-plan configurable if the business needs it later

function toDate(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000) : null;
}

async function assertSchoolUsable(schoolId) {
  const school = await School.findById(schoolId);
  if (!school) throw new AppError('School not found', 404);
  if (school.status === 'Suspended') throw new AppError('School is suspended and cannot hold a subscription', 400);
  return school;
}

/**
 * Lazily creates the matching Razorpay recurring Plan the first time anyone
 * tries to subscribe to it, so Super Admin doesn't have to pre-toggle
 * recurring billing on every plan before it's usable for onboarding.
 * Weekly plans are excluded per business decision (see subscription.service.js).
 */
async function assertPlanUsable(planId) {
  const plan = await subscriptionRepository.findById(planId);
  if (!plan) throw new AppError('Plan not found', 404);
  if (plan.status && plan.status !== 'active') throw new AppError('This plan is not currently available', 400);
  if (!plan.razorpayPlanId) {
    const interval = mapPlanTypeToInterval(plan.planType);
    if (!interval) {
      console.log(`[subscription-flow] plan "${plan.name}" (${plan.planType}) cannot be recurring — no interval mapping`);
      throw new AppError(
        'This plan does not support recurring billing — only Monthly or Yearly plans can be subscribed to. Ask your Super Admin to adjust it.',
        400
      );
    }
    console.log(`[subscription-flow] lazily creating Razorpay Plan for "${plan.name}" — interval=${interval} amount=₹${plan.price}`);
    const rzpPlan = await razorpaySubscriptionService.createPlan({
      interval,
      intervalCount: 1,
      amountPaise: Math.round(plan.price * 100),
      currency: 'INR',
      name: plan.name,
      description: plan.description,
    });
    console.log(`[subscription-flow] Razorpay Plan created — razorpayPlanId=${rzpPlan.id}`);
    plan.razorpayPlanId = rzpPlan.id;
    plan.billingInterval = interval;
    plan.billingIntervalCount = 1;
    await plan.save();
  }
  return plan;
}

function planAmountRupees(plan, quantity = 1) {
  return Math.round(plan.price * quantity * 100) / 100;
}

class SchoolSubscriptionService {
  // ---------------------------------------------------------------
  // Create (Super Admin explicit school, or School Admin self-serve)
  // ---------------------------------------------------------------
  async create(schoolId, { planId, startDate, trialDays, quantity }, actor) {
    const school = await assertSchoolUsable(schoolId);
    const plan = await assertPlanUsable(planId);

    const existing = await schoolSubscriptionRepository.findActiveLikeForSchool(schoolId);
    if (existing) {
      throw new AppError('This school already has an active or pending subscription', 409);
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const effectiveTrialDays = trialDays !== undefined && trialDays !== null ? Number(trialDays) : plan.trialDays || 0;

    console.log(`[subscription-flow] finding/creating Razorpay customer — school="${school.name}"`);
    const customer = await razorpaySubscriptionService.findOrCreateCustomer({
      name: school.name,
      email: school.contact?.email || school.email || undefined,
      contact: school.contact?.phone || school.phone || undefined,
      notes: { schoolId: String(schoolId), schoolCode: school.schoolId || '' },
    });
    console.log(`[subscription-flow] Razorpay customer ready — razorpayCustomerId=${customer.id}`);

    // Standard 10-year recurring count:
    // Monthly: 10 years * 12 months = 120 cycles
    // Yearly: 10 years = 10 cycles
    // Weekly: 10 years * 52 weeks = 520 cycles
    const standard10YearCount = plan.billingInterval === 'yearly' ? 10 : (plan.billingInterval === 'weekly' ? 520 : 120);

    console.log(`[subscription-flow] creating Razorpay Subscription — razorpayPlanId=${plan.razorpayPlanId} cycles=${standard10YearCount} qty=${qty} trialDays=${effectiveTrialDays}`);
    let rzpSub;
    try {
      rzpSub = await razorpaySubscriptionService.createSubscription({
        razorpayPlanId: plan.razorpayPlanId,
        totalCount: standard10YearCount,
        quantity: qty,
        startAt: effectiveTrialDays > 0 ? new Date(Date.now() + effectiveTrialDays * 86400000) : startDate,
        notes: { schoolId: String(schoolId), planId: String(planId) },
      });
    } catch (error) {
      console.log(`[subscription-flow] Razorpay Subscription creation FAILED — school=${schoolId}: ${error?.message}`);
      throw error; // razorpaySubscriptionService already wraps this as an AppError
    }
    console.log(`[subscription-flow] Razorpay Subscription created — razorpaySubscriptionId=${rzpSub.id} status=${rzpSub.status}`);

    const doc = await schoolSubscriptionRepository.create({
      schoolId,
      planId,
      razorpaySubscriptionId: rzpSub.id,
      razorpayCustomerId: customer.id,
      status: rzpSub.status || 'created',
      quantity: qty,
      totalAmount: planAmountRupees(plan, qty),
      currency: 'INR',
      trialStart: effectiveTrialDays > 0 ? new Date() : null,
      trialEnd: effectiveTrialDays > 0 ? new Date(Date.now() + effectiveTrialDays * 86400000) : null,
      currentPeriodStart: toDate(rzpSub.current_start),
      currentPeriodEnd: toDate(rzpSub.current_end),
      nextBillingAt: toDate(rzpSub.charge_at),
      createdBy: actor?.name || actor?.email || 'System',
    });

    await schoolSubscriptionRepository.recordHistory({
      schoolId,
      subscriptionId: doc._id,
      action: 'created',
      toPlan: planId,
      toStatus: doc.status,
      performedBy: actor?.name || 'System',
      source: actor?.source || 'super_admin',
    });
    auditLogService.record(actor?.req, {
      module: 'SUBSCRIPTION',
      action: 'SUBSCRIPTION_CREATED',
      entityType: 'SchoolSubscription',
      entityId: doc._id.toString(),
      summary: `Created ${plan.name} subscription for school ${school.name}`,
    });

    return {
      subscription: doc.toPublicJSON({ plan: plan.toPublicJSON() }),
      razorpayKeyId: razorpaySubscriptionService.publicKeyId(),
      razorpaySubscriptionId: rzpSub.id,
    };
  }

  async checkoutForSchool(schoolId, { planId }, actor) {
    return this.create(schoolId, { planId }, { ...actor, source: 'school_admin' });
  }

  // ---------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------
  async get(id) {
    const doc = await schoolSubscriptionRepository.findById(id);
    if (!doc) throw new AppError('Subscription not found', 404);
    return doc;
  }

  async getPublic(id) {
    const doc = await this.get(id);
    return doc.toPublicJSON({ plan: doc.planId?.toPublicJSON?.() });
  }

  async getForSchool(schoolId) {
    const doc = await schoolSubscriptionRepository.findForSchool(schoolId);
    if (!doc) return null;
    return doc.toPublicJSON({ plan: doc.planId?.toPublicJSON?.() });
  }

  async list(query = {}) {
    const { items, total, page, limit } = await schoolSubscriptionRepository.list(query);
    return {
      data: items.map((i) =>
        i.toPublicJSON({
          plan: i.planId?.toPublicJSON?.(),
          school: i.schoolId?.name ? { id: i.schoolId._id?.toString(), name: i.schoolId.name, status: i.schoolId.status } : undefined,
        })
      ),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async stats() {
    return schoolSubscriptionRepository.stats();
  }

  // ---------------------------------------------------------------
  // Cancellation
  // ---------------------------------------------------------------
  async cancel(id, { immediate, reason } = {}, actor) {
    const doc = await this.get(id);
    if (!doc.razorpaySubscriptionId) throw new AppError('Subscription has no Razorpay linkage to cancel', 400);
    if (doc.status === 'cancelled' || doc.status === 'completed') {
      throw new AppError('Subscription is already cancelled', 400);
    }
    if (immediate && actor?.role !== 'SuperAdmin' && actor?.role !== 'SCHOOLADMIN') {
      // Belt-and-suspenders — the route guard is the real enforcement point.
      throw new AppError('Only Super Admin can cancel a subscription immediately', 403);
    }

    const rzpSub = await razorpaySubscriptionService.cancelSubscription(doc.razorpaySubscriptionId, {
      atCycleEnd: !immediate,
    });

    const fromStatus = doc.status;
    if (immediate) {
      doc.status = 'cancelled';
      doc.cancelledAt = new Date();
      doc.endedAt = new Date();
    } else {
      doc.cancelAtPeriodEnd = true;
      // Razorpay keeps status 'active' until the period actually ends; webhook/cron flips it then.
      doc.status = rzpSub.status || doc.status;
    }
    await schoolSubscriptionRepository.save(doc);

    await schoolSubscriptionRepository.recordHistory({
      schoolId: doc.schoolId,
      subscriptionId: doc._id,
      action: immediate ? 'cancelled' : 'cancel_requested',
      fromStatus,
      toStatus: doc.status,
      reason: reason || '',
      performedBy: actor?.name || 'System',
      source: actor?.source || 'super_admin',
    });
    auditLogService.record(actor?.req, {
      module: 'SUBSCRIPTION',
      action: immediate ? 'SUBSCRIPTION_CANCELLED' : 'SUBSCRIPTION_CANCEL_REQUESTED',
      entityType: 'SchoolSubscription',
      entityId: doc._id.toString(),
      summary: immediate ? 'Cancelled subscription immediately' : `Cancellation scheduled for period end (${doc.currentPeriodEnd?.toISOString?.() || ''})`,
    });

    this._notify(doc, immediate ? 'Subscription cancelled' : 'Cancellation scheduled', immediate
      ? 'Your subscription has been cancelled immediately.'
      : `Your subscription will remain active until ${doc.currentPeriodEnd?.toDateString?.() || 'the end of the billing period'}, then billing will stop.`);

    return doc.toPublicJSON();
  }

  // ---------------------------------------------------------------
  // Plan change (upgrade = now, downgrade = scheduled at cycle end)
  // ---------------------------------------------------------------
  async changePlan(id, { newPlanId }, actor) {
    const doc = await this.get(id);
    if (!ACTIVE_LIKE_STATUSES.includes(doc.status)) {
      throw new AppError('Only an active/pending subscription can change plans', 400);
    }
    const currentPlan = doc.planId; // populated
    const newPlan = await assertPlanUsable(newPlanId);
    if (String(currentPlan._id) === String(newPlanId)) {
      throw new AppError('School is already on this plan', 400);
    }

    const isUpgrade = newPlan.price > currentPlan.price;
    const scheduleChangeAt = isUpgrade ? 'now' : 'cycle_end';

    const rzpSub = await razorpaySubscriptionService.updateSubscriptionPlan(doc.razorpaySubscriptionId, {
      razorpayPlanId: newPlan.razorpayPlanId,
      quantity: doc.quantity,
      scheduleChangeAt,
    });

    const fromStatus = doc.status;
    if (isUpgrade) {
      doc.planId = newPlan._id;
      doc.totalAmount = planAmountRupees(newPlan, doc.quantity);
      doc.pendingPlanId = null;
      doc.pendingChangeType = '';
      doc.pendingChangeEffectiveAt = null;
      doc.status = rzpSub.status || doc.status;
    } else {
      doc.pendingPlanId = newPlan._id;
      doc.pendingChangeType = 'downgrade';
      doc.pendingChangeEffectiveAt = doc.currentPeriodEnd;
    }
    await schoolSubscriptionRepository.save(doc);

    await schoolSubscriptionRepository.recordHistory({
      schoolId: doc.schoolId,
      subscriptionId: doc._id,
      action: isUpgrade ? 'upgraded' : 'downgrade_scheduled',
      fromPlan: currentPlan._id,
      toPlan: newPlan._id,
      fromStatus,
      toStatus: doc.status,
      performedBy: actor?.name || 'System',
      source: actor?.source || 'super_admin',
    });
    auditLogService.record(actor?.req, {
      module: 'SUBSCRIPTION',
      action: 'SUBSCRIPTION_PLAN_CHANGED',
      entityType: 'SchoolSubscription',
      entityId: doc._id.toString(),
      summary: `${isUpgrade ? 'Upgraded' : 'Scheduled downgrade'} from ${currentPlan.name} to ${newPlan.name}`,
    });

    this._notify(
      doc,
      isUpgrade ? 'Plan upgraded' : 'Plan change scheduled',
      isUpgrade
        ? `Your subscription is now on the ${newPlan.name} plan.`
        : `Your subscription will move to the ${newPlan.name} plan at the end of the current billing period.`
    );

    return doc.toPublicJSON({ plan: (isUpgrade ? newPlan : currentPlan).toPublicJSON?.() });
  }

  // ---------------------------------------------------------------
  // Sub-resources
  // ---------------------------------------------------------------
  async listPayments(subscriptionId, query) {
    const { items, total, page, limit } = await schoolSubscriptionRepository.listPayments(subscriptionId, query);
    return { data: items.map((i) => i.toPublicJSON()), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }
  async listInvoices(subscriptionId, query) {
    const { items, total, page, limit } = await schoolSubscriptionRepository.listInvoicesForSubscription(subscriptionId, query);
    return { data: items.map((i) => i.toPublicJSON()), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }
  async listHistory(subscriptionId, query) {
    const { items, total, page, limit } = await schoolSubscriptionRepository.listHistory(subscriptionId, query);
    return { data: items.map((i) => i.toPublicJSON()), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  // ---------------------------------------------------------------
  // Super Admin override
  // ---------------------------------------------------------------
  async adminOverride(id, { action, extendDays, reason }, actor) {
    const doc = await this.get(id);
    const fromStatus = doc.status;
    if (action === 'extend') {
      const days = Math.max(1, Number(extendDays) || 0);
      if (!days) throw new AppError('extendDays must be a positive number', 400);
      doc.currentPeriodEnd = new Date((doc.currentPeriodEnd?.getTime() || Date.now()) + days * 86400000);
      doc.gracePeriodEndsAt = null;
      if (doc.status === 'halted' || doc.status === 'expired') doc.status = 'active';
    } else if (action === 'grant_grace') {
      doc.gracePeriodEndsAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 86400000);
    } else if (action === 'force_status' && extendDays === undefined) {
      throw new AppError('force_status requires a target status', 400);
    } else {
      throw new AppError('Unknown override action', 400);
    }
    await schoolSubscriptionRepository.save(doc);
    await schoolSubscriptionRepository.recordHistory({
      schoolId: doc.schoolId,
      subscriptionId: doc._id,
      action: 'admin_override',
      fromStatus,
      toStatus: doc.status,
      reason: reason || '',
      performedBy: actor?.name || 'Super Admin',
      source: 'super_admin',
    });
    auditLogService.record(actor?.req, {
      module: 'SUBSCRIPTION',
      action: 'SUBSCRIPTION_ADMIN_OVERRIDE',
      entityType: 'SchoolSubscription',
      entityId: doc._id.toString(),
      summary: `Override: ${action} — ${reason || 'no reason given'}`,
    });
    return doc.toPublicJSON();
  }

  // ---------------------------------------------------------------
  // Internal helper used by webhook/cron services too
  // ---------------------------------------------------------------
  _notify(doc, title, body) {
    if (!doc.schoolId) return;
    const schoolId = String(doc.schoolId._id || doc.schoolId);
    notificationService
      .send({ title, body, audiences: ['school-admin'] }, 'Billing System', { schoolId })
      .catch((err) => console.error(`[subscription-flow] notification "${title}" failed for school ${schoolId}: ${err?.message}`));
  }
}

export const schoolSubscriptionService = new SchoolSubscriptionService();
export { GRACE_PERIOD_DAYS, toDate, assertSchoolUsable, assertPlanUsable };
