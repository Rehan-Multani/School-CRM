import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { School } from '../models/School.js';
import { schoolSubscriptionRepository } from '../repositories/schoolSubscription.repository.js';
import { cachedSubscription } from '../utils/entitlementCache.js';

export const ACCESS_STATES = ['none', 'manual', 'trial', 'active', 'grace_period', 'past_due', 'cancelled_pending', 'expired'];

const ended = (date) => Boolean(date) && Date.now() >= new Date(date).getTime();

function deriveState(sub) {
  const now = Date.now();
  if (sub.trialEnd && now < new Date(sub.trialEnd).getTime() && sub.status !== 'cancelled' && sub.status !== 'expired') {
    return 'trial';
  }
  if (sub.status === 'expired') return 'expired';
  if (sub.status === 'cancelled') {
    // Cancelled but the paid-for period hasn't ended yet -> access continues.
    if (sub.currentPeriodEnd && now < new Date(sub.currentPeriodEnd).getTime()) return 'cancelled_pending';
    return 'expired';
  }
  // "Cancel at period end": autopay is already switched off, so nothing will
  // renew it. The period end is the end — do not wait for the webhook / cron
  // to flip the status before closing the portal.
  if (sub.cancelAtPeriodEnd) {
    return ended(sub.currentPeriodEnd) ? 'expired' : 'cancelled_pending';
  }
  if (sub.gracePeriodEndsAt && now < new Date(sub.gracePeriodEndsAt).getTime()) return 'grace_period';
  if (sub.status === 'halted' || sub.status === 'pending') return 'past_due';
  if (sub.status === 'active' || sub.status === 'authenticated' || sub.status === 'created') return 'active';
  return 'expired';
}

// States that still grant full product access. `past_due` is intentionally
// included here (configurable) — a single missed/retrying payment shouldn't
// instantly lock a school out; `expired` (grace exhausted) is what restricts.
const FULL_ACCESS_STATES = new Set(['manual', 'trial', 'active', 'grace_period', 'past_due', 'cancelled_pending']);

/**
 * A plan given outside Razorpay autopay: an invoice the Super Admin marked as
 * paid, or a seeded demo school. It counts only while it is marked Active and
 * its end date (when it has one) is still ahead — a plan NAME alone is not a plan.
 */
function manualPlanActive(school) {
  if (!school?.subscriptionPlan) return false;
  if (school.subscription?.status !== 'Active') return false;
  return !ended(school.subscription?.endsAt);
}

const SCHOOL_PLAN_FIELDS = 'subscriptionPlan subscription.status subscription.endsAt';

function loadSchoolPlan(schoolId) {
  if (!schoolId) return null;
  const query = mongoose.isValidObjectId(schoolId) ? School.findById(schoolId) : School.findOne({ schoolId: String(schoolId) });
  return query.select(SCHOOL_PLAN_FIELDS).lean();
}

// Shown to everyone who is NOT the School Admin (staff, teachers, students,
// parents) when their school has no plan. Only the School Admin can fix it.
export const SCHOOL_SUBSCRIPTION_INACTIVE = 'SCHOOL_SUBSCRIPTION_INACTIVE';
export const SCHOOL_SUBSCRIPTION_INACTIVE_MESSAGE =
  'Your school does not have an active subscription, so sign-in is turned off. Please contact your school administrator.';

class SubscriptionAccessService {
  /**
   * Resolves what a school is entitled to right now. A school has access when
   *   - its Razorpay autopay subscription is live (active / trial / inside the
   *     grace period / cancelled but the paid period is still running), or
   *   - it holds an active manual plan (see manualPlanActive).
   * A school with neither has NO access: its School Admin can only reach the
   * Plans page, and nobody else in the school can sign in.
   */
  async getEntitlement(schoolId) {
    const [sub, school] = await Promise.all([schoolSubscriptionRepository.findForSchool(schoolId), loadSchoolPlan(schoolId)]);
    return this.#resolve(sub, school);
  }

  /**
   * Same result as getEntitlement, for the per-request subscription gate: the
   * subscription + plan rows are cached for a few seconds (see
   * utils/entitlementCache.js) and the state is still derived fresh, so this
   * saves the gate's DB round-trips on every API call without delaying expiry.
   */
  async getGateEntitlement(schoolId) {
    const { sub, school } = await cachedSubscription(schoolId, async () => {
      const [s, sc] = await Promise.all([schoolSubscriptionRepository.findForSchool(schoolId).lean(), loadSchoolPlan(schoolId)]);
      return { sub: s, school: sc };
    });
    return this.#resolve(sub, school);
  }

  #resolve(sub, school) {
    const state = sub ? deriveState(sub) : 'none';
    const plan = sub?.planId || null; // populated by findForSchool
    if (sub && FULL_ACCESS_STATES.has(state)) {
      return {
        state,
        hasFullAccess: true,
        features: plan?.features?.length ? plan.features : null, // null = no explicit restriction list configured
        plan,
        subscription: sub,
      };
    }
    if (manualPlanActive(school)) {
      return { state: 'manual', hasFullAccess: true, features: null, plan: null, subscription: sub || null };
    }
    // 'none' = never had a plan; 'expired' = had one and it ended.
    return { state: sub ? 'expired' : 'none', hasFullAccess: false, features: null, plan, subscription: sub || null };
  }

  async canAccessFeature(schoolId, feature) {
    const entitlement = await this.getEntitlement(schoolId);
    if (!entitlement.hasFullAccess) return false;
    if (!feature) return true;
    if (!entitlement.features) return true; // plan doesn't restrict by feature list
    return entitlement.features.includes(feature);
  }

  /**
   * Sign-in guard for every role except the School Admin. Call it after the
   * password / OTP has been verified and before a token is issued, so an
   * account at a school without a plan gets a clear reason instead of a
   * session that cannot do anything.
   */
  async assertSchoolCanSignIn(schoolId) {
    if (!schoolId) return;
    const entitlement = await this.getEntitlement(schoolId);
    if (!entitlement.hasFullAccess) {
      throw new AppError(SCHOOL_SUBSCRIPTION_INACTIVE_MESSAGE, 403, SCHOOL_SUBSCRIPTION_INACTIVE);
    }
  }
}

export const subscriptionAccessService = new SubscriptionAccessService();
