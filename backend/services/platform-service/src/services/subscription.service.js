import { AppError } from '../../../shared/AppError.js';
import { PLAN_TYPES, BILLING_INTERVALS, PLAN_STATUSES } from '../models/SubscriptionPlan.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { razorpaySubscriptionService } from './razorpaySubscription.service.js';

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new AppError(`${label} is required`, 400);
  }
  return text;
}

function normalizePrice(value) {
  const price = Number(value);
  if (Number.isNaN(price) || price < 0) {
    throw new AppError('Price must be a valid amount', 400);
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

  async updatePlan(id, payload) {
    try {
      const next = normalizePayload(payload);
      delete next.createdBy;
      // Razorpay plan amount/interval are immutable once created — a real price
      // change requires creating a new plan and migrating subscriptions, not a
      // silent edit of the linked Razorpay plan.
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
