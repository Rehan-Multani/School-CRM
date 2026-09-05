import os from 'os';
import { acquireCronLock, releaseCronLock } from '../models/CronLock.js';
import { RazorpayWebhookEvent } from '../models/RazorpayWebhookEvent.js';
import { schoolSubscriptionRepository } from '../repositories/schoolSubscription.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { razorpaySubscriptionService } from '../services/razorpaySubscription.service.js';
import { razorpayWebhookService, grantSchoolPlanIfNeeded } from '../services/razorpayWebhook.service.js';
import { GRACE_PERIOD_DAYS, toDate } from '../services/schoolSubscription.service.js';
import { notificationService } from '../services/notification.service.js';

const HOLDER = `${os.hostname()}:${process.pid}`;

function log(job, message) {
  // eslint-disable-next-line no-console
  console.log(`[cron.${job}] ${message}`);
}

/**
 * Runs `fn` only if this process wins the distributed lock for `jobName`.
 * Safe with multiple platform-service instances: exactly one instance runs
 * the job per tick; the rest see acquireCronLock() return false and skip.
 */
async function withLock(jobName, ttlMs, fn) {
  const acquired = await acquireCronLock(jobName, ttlMs, HOLDER).catch((err) => {
    log(jobName, `lock acquisition failed: ${err.message}`);
    return false;
  });
  if (!acquired) {
    log(jobName, 'skipped — another instance holds the lock');
    return;
  }
  try {
    await fn();
  } catch (error) {
    log(jobName, `job threw: ${error?.message}`);
  } finally {
    await releaseCronLock(jobName).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Job 1 — Reconciliation: local state vs Razorpay's authoritative state.
// Never downgrades based on a stale/failed read — if the Razorpay fetch fails,
// the subscription is simply left alone until the next tick.
// ---------------------------------------------------------------------------
export async function runReconciliationJob() {
  await withLock('subscription-reconciliation', 25 * 60 * 1000, async () => {
    if (!razorpaySubscriptionService.isConfigured()) {
      log('reconciliation', 'Razorpay not configured — skipping');
      return;
    }
    const staleBefore = new Date(Date.now() - 6 * 60 * 60 * 1000); // re-check anything not touched in 6h
    const candidates = await schoolSubscriptionRepository.findNeedingReconciliation(staleBefore);
    let checked = 0;
    let updated = 0;
    for (const sub of candidates) {
      checked += 1;
      try {
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
          updated += 1;
          await schoolSubscriptionRepository.recordHistory({
            schoolId: sub.schoolId,
            subscriptionId: sub._id,
            action: 'reconciled',
            fromStatus,
            toStatus: sub.status,
            performedBy: 'Cron',
            source: 'cron',
          });
        }
        // Safety net for a webhook that never arrived at all (not just one that
        // failed after being received — runWebhookRecoveryJob covers that case).
        // Without this, a school that Razorpay confirms as paid could stay
        // locked out forever if subscription.activated/charged was never
        // delivered. grantSchoolPlanIfNeeded no-ops once already granted, so
        // this is safe to call on every reconciled-active tick, not just
        // on the tick where the status actually changed.
        if (sub.status === 'active') {
          await grantSchoolPlanIfNeeded(sub).catch((err) => {
            log('reconciliation', `grantSchoolPlanIfNeeded failed for school ${sub.schoolId}: ${err.message}`);
          });
        }
      } catch (error) {
        // Fetch failed (network/Razorpay outage) — leave local state untouched, try again next tick.
        log('reconciliation', `fetch failed for ${sub.razorpaySubscriptionId}: ${error.message}`);
      }
    }
    log('reconciliation', `checked ${checked}, updated ${updated}`);
  });
}

// ---------------------------------------------------------------------------
// Job 2 — Expiry check: cancel-at-period-end subscriptions whose period has
// actually ended now flip to 'cancelled' locally (Razorpay itself already
// stops billing; this just finalizes local state + entitlement).
// ---------------------------------------------------------------------------
export async function runExpiryCheckJob() {
  await withLock('subscription-expiry-check', 15 * 60 * 1000, async () => {
    const now = new Date();
    const expired = await schoolSubscriptionRepository.findExpiredNotMarked(now);
    for (const sub of expired) {
      const fromStatus = sub.status;
      sub.status = 'cancelled';
      sub.cancelledAt = sub.cancelledAt || now;
      sub.endedAt = now;
      await schoolSubscriptionRepository.save(sub);
      await schoolSubscriptionRepository.recordHistory({
        schoolId: sub.schoolId,
        subscriptionId: sub._id,
        action: 'expired',
        fromStatus,
        toStatus: sub.status,
        performedBy: 'Cron',
        source: 'cron',
      });
    }
    log('expiry-check', `finalized ${expired.length} period-end cancellation(s)`);
  });
}

// ---------------------------------------------------------------------------
// Job 2b — Pending plan change: changePlan() schedules a downgrade on Razorpay
// for cycle-end (schoolSubscription.service.js), but Razorpay's webhooks only
// ever report status/period changes, never a plan change — so nothing else
// applies the local plan swap. Without this, `planId`/`totalAmount` would
// stay on the old (more expensive) plan forever after the downgrade takes
// effect on Razorpay's side.
// ---------------------------------------------------------------------------
export async function runPendingPlanChangeJob() {
  await withLock('subscription-pending-plan-change', 15 * 60 * 1000, async () => {
    const now = new Date();
    const due = await schoolSubscriptionRepository.findPendingDowngradesDue(now);
    for (const sub of due) {
      const fromPlanId = sub.planId;
      const newPlan = await subscriptionRepository.findById(sub.pendingPlanId);
      if (!newPlan) {
        // Plan was deleted after the downgrade was scheduled — clear the
        // pending change rather than retrying it forever; current plan stands.
        sub.pendingPlanId = null;
        sub.pendingChangeType = '';
        sub.pendingChangeEffectiveAt = null;
        await schoolSubscriptionRepository.save(sub);
        continue;
      }
      sub.planId = newPlan._id;
      sub.totalAmount = Math.round(newPlan.price * sub.quantity * 100) / 100;
      sub.pendingPlanId = null;
      sub.pendingChangeType = '';
      sub.pendingChangeEffectiveAt = null;
      await schoolSubscriptionRepository.save(sub);
      await schoolSubscriptionRepository.recordHistory({
        schoolId: sub.schoolId,
        subscriptionId: sub._id,
        action: 'downgraded',
        fromPlan: fromPlanId,
        toPlan: newPlan._id,
        performedBy: 'Cron',
        source: 'cron',
        reason: 'Scheduled downgrade applied at cycle end',
      });
    }
    log('pending-plan-change', `applied ${due.length} scheduled downgrade(s)`);
  });
}

// ---------------------------------------------------------------------------
// Job 3 — Grace period: once gracePeriodEndsAt has passed for a still-failing
// subscription, flip to 'expired' (restricts premium access — never deletes data).
// ---------------------------------------------------------------------------
export async function runGracePeriodJob() {
  await withLock('subscription-grace-period', 15 * 60 * 1000, async () => {
    const now = new Date();
    const overdue = await schoolSubscriptionRepository.findPastGracePeriod(now);
    for (const sub of overdue) {
      const fromStatus = sub.status;
      sub.status = 'expired';
      sub.endedAt = now;
      await schoolSubscriptionRepository.save(sub);
      await schoolSubscriptionRepository.recordHistory({
        schoolId: sub.schoolId,
        subscriptionId: sub._id,
        action: 'expired',
        fromStatus,
        toStatus: sub.status,
        reason: `Grace period (${GRACE_PERIOD_DAYS}d) expired with unresolved payment failure`,
        performedBy: 'Cron',
        source: 'cron',
      });
      notificationService
        .send(
          { title: 'Subscription expired', body: 'Your grace period has ended. Premium features are now restricted until payment is resolved.', audiences: ['school-admin'] },
          'Billing System',
          { schoolId: String(sub.schoolId) }
        )
        .catch((err) => log('grace-period', `notification failed for school ${sub.schoolId}: ${err?.message}`));
    }
    log('grace-period', `expired ${overdue.length} subscription(s) past grace period`);
  });
}

// ---------------------------------------------------------------------------
// Job 4 — Failed payment recovery: reminder notifications, deduped via
// lastFailureNotifiedAt so a school isn't spammed every tick.
// ---------------------------------------------------------------------------
export async function runFailedPaymentRecoveryJob() {
  await withLock('subscription-failed-payment-recovery', 15 * 60 * 1000, async () => {
    const pending = await schoolSubscriptionRepository.findFailuresPendingNotification();
    for (const sub of pending) {
      notificationService
        .send(
          {
            title: 'Payment issue on your subscription',
            body: `We've had ${sub.failureCount} failed payment attempt(s). ${sub.lastFailureReason || ''}`.trim(),
            audiences: ['school-admin'],
          },
          'Billing System',
          { schoolId: String(sub.schoolId) }
        )
        .catch((err) => log('failed-payment-recovery', `notification failed for school ${sub.schoolId}: ${err?.message}`));
      sub.lastFailureNotifiedAt = new Date();
      await schoolSubscriptionRepository.save(sub);
    }
    log('failed-payment-recovery', `notified ${pending.length} school(s)`);
  });
}

// ---------------------------------------------------------------------------
// Job 5 — Webhook recovery: retry events that failed processing, with
// exponential backoff (nextRetryAt, set by razorpayWebhookService.process()).
// Gives up after 10 attempts rather than retrying forever.
// ---------------------------------------------------------------------------
export async function runWebhookRecoveryJob() {
  await withLock('webhook-recovery', 8 * 60 * 1000, async () => {
    const now = new Date();
    const candidates = await RazorpayWebhookEvent.find({
      processed: false,
      failed: true,
      retryCount: { $lt: 10 },
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    }).limit(100);
    for (const event of candidates) {
      await razorpayWebhookService.process(event);
    }
    log('webhook-recovery', `retried ${candidates.length} failed webhook event(s)`);
  });
}

// ---------------------------------------------------------------------------
// Job 6 — Stale subscription detection: flag (never auto-cancel) subscriptions
// stuck in an initial state for too long.
// ---------------------------------------------------------------------------
export async function runStaleDetectionJob() {
  await withLock('subscription-stale-detection', 50 * 60 * 1000, async () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await schoolSubscriptionRepository.findStale(cutoff);
    for (const sub of stale) {
      if (sub.reconciliationNote?.startsWith('STALE:')) continue; // already flagged, don't re-log every tick
      sub.reconciliationNote = `STALE: stuck in "${sub.status}" since ${sub.createdAt.toISOString()} — needs manual review`;
      await schoolSubscriptionRepository.save(sub);
      await schoolSubscriptionRepository.recordHistory({
        schoolId: sub.schoolId,
        subscriptionId: sub._id,
        action: 'reconciled',
        fromStatus: sub.status,
        toStatus: sub.status,
        reason: 'Flagged stale by cron — no automatic cancellation',
        performedBy: 'Cron',
        source: 'cron',
      });
    }
    log('stale-detection', `flagged ${stale.length} stale subscription(s) for review`);
  });
}
