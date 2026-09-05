import { schoolSubscriptionRepository } from '../repositories/schoolSubscription.repository.js';

export const ACCESS_STATES = ['none', 'trial', 'active', 'grace_period', 'past_due', 'cancelled_pending', 'expired'];

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
  if (sub.gracePeriodEndsAt && now < new Date(sub.gracePeriodEndsAt).getTime()) return 'grace_period';
  if (sub.status === 'halted' || sub.status === 'pending') return 'past_due';
  if (sub.status === 'active' || sub.status === 'authenticated' || sub.status === 'created') return 'active';
  return 'expired';
}

// States that still grant full product access. `past_due` is intentionally
// included here (configurable) — a single missed/retrying payment shouldn't
// instantly lock a school out; `expired` (grace exhausted) is what restricts.
const FULL_ACCESS_STATES = new Set(['trial', 'active', 'grace_period', 'past_due', 'cancelled_pending']);

class SubscriptionAccessService {
  /**
   * Resolves what a school is entitled to right now. Schools with NO
   * SchoolSubscription document at all (true for every school until this
   * feature is adopted, or for ones intentionally managed outside Razorpay)
   * are treated as unrestricted — this system must never retroactively lock
   * out a school that was never put on a recurring plan.
   */
  async getEntitlement(schoolId) {
    const sub = await schoolSubscriptionRepository.findForSchool(schoolId);
    if (!sub) {
      return { state: 'none', hasFullAccess: true, features: null, plan: null, subscription: null };
    }
    const state = deriveState(sub);
    const plan = sub.planId; // populated by findForSchool
    return {
      state,
      hasFullAccess: FULL_ACCESS_STATES.has(state),
      features: plan?.features?.length ? plan.features : null, // null = no explicit restriction list configured
      plan,
      subscription: sub,
    };
  }

  async canAccessFeature(schoolId, feature) {
    const entitlement = await this.getEntitlement(schoolId);
    if (!entitlement.hasFullAccess) return false;
    if (!feature) return true;
    if (!entitlement.features) return true; // plan doesn't restrict by feature list
    return entitlement.features.includes(feature);
  }
}

export const subscriptionAccessService = new SubscriptionAccessService();
