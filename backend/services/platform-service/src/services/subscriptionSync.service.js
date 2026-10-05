import { schoolSubscriptionRepository } from '../repositories/schoolSubscription.repository.js';
import { razorpaySubscriptionService } from './razorpaySubscription.service.js';
import { grantSchoolPlanIfNeeded } from './razorpayWebhook.service.js';
import { toDate } from './schoolSubscription.service.js';

/**
 * Brings one local subscription in line with Razorpay's own record of it.
 * Shared by the reconciliation cron and by the Plans page's "did my payment go
 * through?" call, so activation never depends on the webhook alone.
 *
 * Returns true when something changed. Throws when Razorpay cannot be reached —
 * local state is then left untouched for the caller to retry later.
 */
export async function syncSubscriptionFromRazorpay(sub, { performedBy, source }) {
  const live = await razorpaySubscriptionService.fetchSubscription(sub.razorpaySubscriptionId);
  const fromStatus = sub.status;
  let changed = false;
  if (live.status && live.status !== sub.status) {
    sub.status = live.status;
    changed = true;
  }
  if (live.current_start) {
    sub.currentPeriodStart = toDate(live.current_start);
    changed = true;
  }
  if (live.current_end) {
    sub.currentPeriodEnd = toDate(live.current_end);
    changed = true;
  }
  if (live.charge_at) {
    sub.nextBillingAt = toDate(live.charge_at);
  }
  sub.lastReconciledAt = new Date();
  sub.reconciliationNote = changed ? `Synced from Razorpay (was ${fromStatus})` : 'In sync';
  await schoolSubscriptionRepository.save(sub);
  if (changed) {
    await schoolSubscriptionRepository.recordHistory({
      schoolId: sub.schoolId,
      subscriptionId: sub._id,
      action: 'reconciled',
      fromStatus,
      toStatus: sub.status,
      performedBy,
      source,
    });
  }
  // Safety net for a webhook that never arrived at all. Without this, a school
  // that Razorpay confirms as paid could stay locked out if
  // subscription.activated/charged was never delivered. grantSchoolPlanIfNeeded
  // no-ops once already granted, so it is safe on every sync that finds the
  // subscription active, not just the one where the status changed.
  if (sub.status === 'active') {
    await grantSchoolPlanIfNeeded(sub).catch((err) => {
      console.log(`[subscription-flow] grantSchoolPlanIfNeeded failed for school ${sub.schoolId}: ${err.message}`);
    });
  }
  return changed;
}

/**
 * The School Admin has just come back from the Razorpay checkout: ask Razorpay
 * whether the checkout they opened went through. Nothing from the browser is
 * trusted — the answer comes from Razorpay's API for the school's own record.
 */
export async function confirmPendingCheckout(schoolId) {
  if (!razorpaySubscriptionService.isConfigured()) return;
  const pending = await schoolSubscriptionRepository.findPendingCheckoutForSchool(schoolId);
  if (!pending) return;
  await syncSubscriptionFromRazorpay(pending, { performedBy: 'Checkout', source: 'school_admin' });
}
