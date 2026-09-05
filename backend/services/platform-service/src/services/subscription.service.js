import { AppError } from '../../../shared/AppError.js';
import { PLAN_TYPES, BILLING_INTERVALS, PLAN_STATUSES } from '../models/SubscriptionPlan.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { razorpaySubscriptionService } from './razorpaySubscription.service.js';
import { schoolSubscriptionRepository } from '../repositories/schoolSubscription.repository.js';

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new AppError(`${label} is required`, 400);
  }
  return text;
}

function normalizePrice(value) {
  const price = Number(value);
  if (Number.isNaN(price) || price <= 0) {
    throw new AppError('Price must be greater than 0', 400);
  }
  return Math.round(price * 100) / 100;
}

function normalizePlanType(value) {
  const text = requireText(value, 'Plan type');
  const match = PLAN_TYPES.find((type) => type.toLowerCase() === text.toLowerCase());
  if (!match) {
    throw new AppError('Plan type must be Weekly, Monthly, or Yearly', 400);
  }
  return match;
}

function normalizeFeatures(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const features = [
    ...new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    ),
  ];

  if (features.length > 30) {
    throw new AppError('A plan can have at most 30 features', 400);
  }

  return features;
}

function normalizeLimit(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new AppError('Limits must be non-negative numbers', 400);
  return Math.floor(n);
}

function normalizePayload(payload, createdBy) {
  const base = {
    name: requireText(payload?.name, 'Plan name'),
    price: normalizePrice(payload?.price),
    planType: normalizePlanType(payload?.planType),
    features: normalizeFeatures(payload?.features),
    description: typeof payload?.description === 'string' ? payload.description.trim() : '',
  };
  if (createdBy !== undefined) base.createdBy = createdBy;
  if (payload?.code !== undefined) base.code = String(payload.code || '').trim().toUpperCase();
  if (payload?.status !== undefined) {
    if (!PLAN_STATUSES.includes(payload.status)) throw new AppError('Invalid plan status', 400);
    base.status = payload.status;
  }
  if (payload?.limits !== undefined) {
    base.limits = {
      students: normalizeLimit(payload.limits?.students),
      teachers: normalizeLimit(payload.limits?.teachers),
      staff: normalizeLimit(payload.limits?.staff),
    };
  }
  return base;
}

function mapPlanTypeToInterval(planType) {
  if (planType === 'Yearly') return 'yearly';
  if (planType === 'Monthly') return 'monthly';
  return ''; // Weekly has no Razorpay recurring equivalent (period supports daily/weekly/monthly/yearly, but
  // this product intentionally only offers monthly/yearly recurring per the business requirement).
}

export class SubscriptionService {
  async listPlans() {
    const plans = await subscriptionRepository.list();
    return plans.map((plan) => plan.toPublicJSON());
  }

  async getPlan(id) {
    const plan = await subscriptionRepository.findById(id);
    if (!plan) throw new AppError('Subscription plan not found', 404);
    return plan;
  }

  /**
   * Creates a local plan. If `payload.makeRecurring` is true, a matching
   * Razorpay recurring Plan is created first and linked via razorpayPlanId.
   *
   * Recovery path (razorpay succeeds, mongo save fails): the thrown error
   * names the orphaned Razorpay plan id. Re-submitting with
   * `payload.razorpayPlanId` set to that id skips Razorpay creation and just
   * links to the existing plan — this is what prevents duplicate Razorpay
   * plans on retry.
   */
  async createPlan(payload, createdBy) {
    const normalized = normalizePayload(payload, createdBy);

    if (payload?.razorpayPlanId) {
      // Recovery / explicit linkage path — trust only after fetching it back from Razorpay.
      const existing = await razorpaySubscriptionService.fetchPlan(String(payload.razorpayPlanId).trim());
      normalized.razorpayPlanId = existing.id;
      normalized.billingInterval = existing.period === 'yearly' ? 'yearly' : 'monthly';
      normalized.billingIntervalCount = existing.interval || 1;
      normalized.trialDays = Number(payload?.trialDays) || 0;
    } else if (payload?.makeRecurring) {
      const interval = mapPlanTypeToInterval(normalized.planType);
      if (!interval) {
        throw new AppError('Only Monthly or Yearly plans can be made recurring', 400);
      }
      const rzpPlan = await razorpaySubscriptionService.createPlan({
        interval,
        intervalCount: 1,
        amountPaise: Math.round(normalized.price * 100),
        currency: 'INR',
        name: normalized.name,
        description: normalized.description,
      });
      normalized.razorpayPlanId = rzpPlan.id;
      normalized.billingInterval = interval;
      normalized.billingIntervalCount = 1;
      normalized.trialDays = Number(payload?.trialDays) || 0;

      try {
        const plan = await subscriptionRepository.create(normalized);
        return plan.toPublicJSON();
      } catch (error) {
        // Razorpay plan now exists with no local record — do not silently drop this.
        // eslint-disable-next-line no-console
        console.error(
          `[SubscriptionPlan] Razorpay plan ${rzpPlan.id} was created but the local save failed: ${error?.message}. ` +
            'Retry this request with { razorpayPlanId: "' + rzpPlan.id + '" } to link it without creating a duplicate.'
        );
        if (error?.code === 11000) throw new AppError('A plan with this name already exists', 409);
        throw new AppError(
          `Plan was created on Razorpay (${rzpPlan.id}) but could not be saved. Retry with razorpayPlanId="${rzpPlan.id}" to avoid creating a duplicate Razorpay plan.`,
          500
        );
      }
    }

    try {
      const plan = await subscriptionRepository.create(normalized);
      return plan.toPublicJSON();
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError('A plan with this name (or code / Razorpay plan) already exists', 409);
      }
      throw error;
    }
  }

  /**
   * Recurring billing CAN be turned on or off later, but only while no
   * school is actually subscribed to this plan yet — once a Razorpay
   * subscription references this plan, its amount/interval are frozen
   * (that's a Razorpay constraint, not a UI restriction), because changing
   * them out from under a live subscription would desync billing from
   * what schools are actually being charged.
   */
  async updatePlan(id, payload) {
    const existing = await subscriptionRepository.findById(id);
    if (!existing) throw new AppError('Subscription plan not found', 404);

    const next = normalizePayload(payload);
    delete next.createdBy;

    const wantsToEnableRecurring = payload?.makeRecurring === true && !existing.razorpayPlanId;
    const wantsToDisableRecurring = payload?.removeRecurring === true && Boolean(existing.razorpayPlanId);

    if (wantsToEnableRecurring || wantsToDisableRecurring) {
      const linkedCount = await schoolSubscriptionRepository.countByPlan(id);
      if (linkedCount > 0) {
        throw new AppError(
          `Cannot change recurring billing — ${linkedCount} school subscription(s) already use this plan. Create a new plan instead.`,
          409
        );
      }
    }

    const staysRecurring = existing.razorpayPlanId && !wantsToDisableRecurring;
    if (staysRecurring && (next.price !== existing.price || next.planType !== existing.planType)) {
      throw new AppError(
        'This plan is linked to a Razorpay recurring plan — price and billing interval cannot change while it stays recurring. Disable recurring billing first (only possible while no school is subscribed), or create a new plan.',
        400
      );
    }

    if (wantsToEnableRecurring) {
      const interval = mapPlanTypeToInterval(next.planType || existing.planType);
      if (!interval) throw new AppError('Only Monthly or Yearly plans can be made recurring', 400);
      const rzpPlan = await razorpaySubscriptionService.createPlan({
        interval,
        intervalCount: 1,
        amountPaise: Math.round((next.price ?? existing.price) * 100),
        currency: 'INR',
        name: next.name || existing.name,
        description: next.description ?? existing.description,
      });
      next.razorpayPlanId = rzpPlan.id;
      next.billingInterval = interval;
      next.billingIntervalCount = 1;
      next.trialDays = Number(payload?.trialDays) || 0;
    } else if (wantsToDisableRecurring) {
      // Razorpay has no plan-deletion endpoint — the orphaned Razorpay-side
      // plan is simply left unused. Only the local link is cleared.
      next.razorpayPlanId = '';
      next.billingInterval = '';
      next.billingIntervalCount = 1;
      next.trialDays = 0;
    } else if (existing.razorpayPlanId && payload?.trialDays !== undefined) {
      // Staying recurring — trial length is local-only (Razorpay itself is told
      // the delayed start_at per subscription, not stored on the Plan), so it's
      // always safe to adjust even with schools already subscribed.
      next.trialDays = Math.max(0, Number(payload.trialDays) || 0);
    }

    try {
      const plan = await subscriptionRepository.updateById(id, next);
      if (!plan) {
        throw new AppError('Subscription plan not found', 404);
      }
      return plan.toPublicJSON();
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError('A plan with this name already exists', 409);
      }
      throw error;
    }
  }

  async deletePlan(id) {
    const plan = await subscriptionRepository.deleteById(id);
    if (!plan) {
      throw new AppError('Subscription plan not found', 404);
    }
    return plan.toPublicJSON();
  }

  async archivePlan(id) {
    const plan = await subscriptionRepository.updateById(id, { status: 'archived' });
    if (!plan) throw new AppError('Subscription plan not found', 404);
    return plan.toPublicJSON();
  }
}

export const subscriptionService = new SubscriptionService();
export { BILLING_INTERVALS };
