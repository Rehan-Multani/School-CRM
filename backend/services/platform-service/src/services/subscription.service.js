import { AppError } from '../../../shared/AppError.js';
import { PLAN_TYPES } from '../models/SubscriptionPlan.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';

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

function normalizePayload(payload, createdBy) {
  return {
    name: requireText(payload?.name, 'Plan name'),
    price: normalizePrice(payload?.price),
    planType: normalizePlanType(payload?.planType),
    features: normalizeFeatures(payload?.features),
    createdBy,
  };
}

export class SubscriptionService {
  async listPlans() {
    const plans = await subscriptionRepository.list();
    return plans.map((plan) => plan.toPublicJSON());
  }

  async createPlan(payload, createdBy) {
    try {
      const plan = await subscriptionRepository.create(normalizePayload(payload, createdBy));
      return plan.toPublicJSON();
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError('A plan with this name already exists', 409);
      }
      throw error;
    }
  }

  async updatePlan(id, payload) {
    try {
      const next = normalizePayload(payload);
      delete next.createdBy;
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
}

export const subscriptionService = new SubscriptionService();
