import crypto from 'crypto';
import { RazorpayWebhookEvent } from '../models/RazorpayWebhookEvent.js';
import { schoolSubscriptionRepository } from '../repositories/schoolSubscription.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { razorpaySubscriptionService } from './razorpaySubscription.service.js';
import { notificationService } from './notification.service.js';
import { GRACE_PERIOD_DAYS, toDate } from './schoolSubscription.service.js';
import { AppError } from '../../../shared/AppError.js';

function deriveEventId(headerEventId, body) {
  if (headerEventId) return String(headerEventId);
  // Fallback for webhook configs that don't send X-Razorpay-Event-Id: hash the
  // stable parts of the payload so the SAME event always hashes the same way.
  const seed = JSON.stringify({
    event: body?.event,
    created_at: body?.created_at,
    sub: body?.payload?.subscription?.entity?.id,
    pay: body?.payload?.payment?.entity?.id,
    inv: body?.payload?.invoice?.entity?.id,
  });
  return crypto.createHash('sha256').update(seed).digest('hex');
}

async function findSubscriptionByRazorpayId(razorpaySubscriptionId) {
  if (!razorpaySubscriptionId) return null;
  return schoolSubscriptionRepository.findByRazorpayId(razorpaySubscriptionId);
}

function notifySchool(sub, title, body) {
  if (!sub?.schoolId) return;
  notificationService
    .send({ title, body, audiences: ['school-admin'] }, 'Billing System', { schoolId: String(sub.schoolId) })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Event handlers — each receives the raw Razorpay `payload` object and the
// already-loaded local `sub` (SchoolSubscription doc), and is responsible for
// its own persistence. Every handler must be safe to run twice (the event
// itself is only processed once thanks to the eventId unique index, but a
// handler can still be re-entered by a manual retry job).
// ---------------------------------------------------------------------------

async function handleSubscriptionAuthenticated(sub, entity) {
  sub.status = 'authenticated';
  await schoolSubscriptionRepository.save(sub);
}

async function handleSubscriptionActivated(sub, entity) {
  const fromStatus = sub.status;
  sub.status = entity.status || 'active';
  sub.currentPeriodStart = toDate(entity.current_start);
  sub.currentPeriodEnd = toDate(entity.current_end);
  sub.nextBillingAt = toDate(entity.charge_at);
  sub.failureCount = 0;
  sub.gracePeriodEndsAt = null;
  await schoolSubscriptionRepository.save(sub);
  await schoolSubscriptionRepository.recordHistory({
    schoolId: sub.schoolId,
    subscriptionId: sub._id,
    action: 'activated',
    fromStatus,
    toStatus: sub.status,
    performedBy: 'Razorpay',
    source: 'webhook',
  });
  notifySchool(sub, 'Subscription activated', 'Your subscription is now active.');
}

async function handleSubscriptionCharged(sub, entity, paymentEntity, invoiceEntity) {
  const fromStatus = sub.status;
  sub.status = 'active';
  sub.currentPeriodStart = toDate(entity.current_start);
  sub.currentPeriodEnd = toDate(entity.current_end);
  sub.nextBillingAt = toDate(entity.charge_at);
  sub.failureCount = 0;
  sub.lastFailureReason = '';
  sub.gracePeriodEndsAt = null;

  if (paymentEntity?.id) {
    sub.lastPaymentAt = new Date();
    sub.lastPaymentId = paymentEntity.id;
    const existingPayment = await schoolSubscriptionRepository.findPaymentByRazorpayId(paymentEntity.id);
    if (!existingPayment) {
      await schoolSubscriptionRepository.createPayment({
        schoolId: sub.schoolId,
        subscriptionId: sub._id,
        razorpayPaymentId: paymentEntity.id,
        razorpaySubscriptionId: entity.id,
        razorpayInvoiceId: invoiceEntity?.id || '',
        amount: (paymentEntity.amount || 0) / 100,
        currency: paymentEntity.currency || 'INR',
        status: paymentEntity.captured ? 'captured' : 'authorized',
        method: paymentEntity.method || '',
        captured: Boolean(paymentEntity.captured),
        paidAt: new Date(),
      });
    }
  }

  if (invoiceEntity?.id) {
    sub.latestInvoiceId = invoiceEntity.id;
    await upsertInvoiceFromRazorpay(sub, invoiceEntity);
  }

  await schoolSubscriptionRepository.save(sub);
  await schoolSubscriptionRepository.recordHistory({
    schoolId: sub.schoolId,
    subscriptionId: sub._id,
    action: fromStatus === 'created' || fromStatus === 'authenticated' ? 'activated' : 'renewed',
    fromStatus,
    toStatus: sub.status,
    performedBy: 'Razorpay',
    source: 'webhook',
    metadata: { razorpayPaymentId: paymentEntity?.id },
  });
  notifySchool(sub, 'Payment successful', `Your payment of ₹${((paymentEntity?.amount || 0) / 100).toLocaleString('en-IN')} was received.`);
}

async function handleSubscriptionPending(sub, entity) {
  const fromStatus = sub.status;
  sub.status = 'pending';
  if (!sub.gracePeriodEndsAt) sub.gracePeriodEndsAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 86400000);
  await schoolSubscriptionRepository.save(sub);
  await schoolSubscriptionRepository.recordHistory({
    schoolId: sub.schoolId,
    subscriptionId: sub._id,
    action: 'payment_failed',
    fromStatus,
    toStatus: sub.status,
    performedBy: 'Razorpay',
    source: 'webhook',
  });
  notifySchool(sub, 'Payment retry in progress', 'Your last payment did not go through. Razorpay will retry automatically.');
}

async function handleSubscriptionHalted(sub, entity) {
  const fromStatus = sub.status;
  sub.status = 'halted';
  sub.gracePeriodEndsAt = new Date(Date.now() + GRACE_PERIOD_DAYS * 86400000);
  await schoolSubscriptionRepository.save(sub);
  await schoolSubscriptionRepository.recordHistory({
    schoolId: sub.schoolId,
    subscriptionId: sub._id,
    action: 'payment_failed',
    fromStatus,
    toStatus: sub.status,
    reason: 'Razorpay halted the subscription after repeated payment failures',
    performedBy: 'Razorpay',
    source: 'webhook',
  });
  notifySchool(
    sub,
    'Action needed: payment failed',
    `We could not process your subscription payment. You have ${GRACE_PERIOD_DAYS} day(s) to update your payment method before access is restricted.`
  );
}

async function handleSubscriptionPaused(sub) {
  const fromStatus = sub.status;
  sub.status = 'paused';
  await schoolSubscriptionRepository.save(sub);
  await schoolSubscriptionRepository.recordHistory({ schoolId: sub.schoolId, subscriptionId: sub._id, action: 'paused', fromStatus, toStatus: sub.status, performedBy: 'Razorpay', source: 'webhook' });
}

async function handleSubscriptionResumed(sub, entity) {
  const fromStatus = sub.status;
  sub.status = entity.status || 'active';
  await schoolSubscriptionRepository.save(sub);
  await schoolSubscriptionRepository.recordHistory({ schoolId: sub.schoolId, subscriptionId: sub._id, action: 'resumed', fromStatus, toStatus: sub.status, performedBy: 'Razorpay', source: 'webhook' });
}

async function handleSubscriptionCancelled(sub) {
  const fromStatus = sub.status;
  sub.status = 'cancelled';
  sub.cancelledAt = sub.cancelledAt || new Date();
  sub.endedAt = new Date();
  await schoolSubscriptionRepository.save(sub);
  await schoolSubscriptionRepository.recordHistory({ schoolId: sub.schoolId, subscriptionId: sub._id, action: 'cancelled', fromStatus, toStatus: sub.status, performedBy: 'Razorpay', source: 'webhook' });
  notifySchool(sub, 'Subscription cancelled', 'Your subscription has ended.');
}

async function handleSubscriptionCompleted(sub) {
  const fromStatus = sub.status;
  sub.status = 'completed';
  sub.endedAt = new Date();
  await schoolSubscriptionRepository.save(sub);
  await schoolSubscriptionRepository.recordHistory({ schoolId: sub.schoolId, subscriptionId: sub._id, action: 'expired', fromStatus, toStatus: sub.status, performedBy: 'Razorpay', source: 'webhook' });
}

async function handlePaymentFailed(sub, paymentEntity) {
  if (!sub) return;
  const existing = paymentEntity?.id ? await schoolSubscriptionRepository.findPaymentByRazorpayId(paymentEntity.id) : null;
  if (!existing && paymentEntity?.id) {
    await schoolSubscriptionRepository.createPayment({
      schoolId: sub.schoolId,
      subscriptionId: sub._id,
      razorpayPaymentId: paymentEntity.id,
      razorpaySubscriptionId: sub.razorpaySubscriptionId,
      amount: (paymentEntity.amount || 0) / 100,
      currency: paymentEntity.currency || 'INR',
      status: 'failed',
      method: paymentEntity.method || '',
      failureReason: paymentEntity.error_description || '',
      failureCode: paymentEntity.error_code || '',
    });
  }
  sub.failureCount = (sub.failureCount || 0) + 1;
  sub.lastFailureReason = paymentEntity?.error_description || 'Payment failed';
  sub.lastFailureAt = new Date();
  await schoolSubscriptionRepository.save(sub);
}

async function upsertInvoiceFromRazorpay(sub, invoiceEntity, statusOverride) {
  const school = sub.schoolId?.name ? sub.schoolId : null; // may or may not be populated depending on caller
  const existing = await schoolSubscriptionRepository.findInvoiceByRazorpayId(invoiceEntity.id);
  const patch = {
    source: 'RAZORPAY_SUBSCRIPTION',
    subscriptionId: sub._id,
    razorpaySubscriptionId: sub.razorpaySubscriptionId,
    razorpayInvoiceId: invoiceEntity.id,
    amount: (invoiceEntity.amount || 0) / 100,
    tax: (invoiceEntity.tax_amount || 0) / 100,
    currency: invoiceEntity.currency || 'INR',
    status: statusOverride || (invoiceEntity.status === 'paid' ? 'Paid' : invoiceEntity.status === 'expired' ? 'Overdue' : 'Pending'),
    issuedAt: toDate(invoiceEntity.date) || new Date(),
    dueAt: toDate(invoiceEntity.date) || new Date(),
    paidAt: invoiceEntity.status === 'paid' ? toDate(invoiceEntity.paid_at) || new Date() : null,
    billingPeriodStart: toDate(invoiceEntity.billing_start),
    billingPeriodEnd: toDate(invoiceEntity.billing_end),
    pdfUrl: invoiceEntity.short_url || '',
  };
  if (existing) {
    return schoolSubscriptionRepository.updateInvoiceById(existing._id, patch);
  }
  return schoolSubscriptionRepository.createInvoice({
    invoiceNumber: `RZP-${invoiceEntity.id}`.toUpperCase(),
    school: sub.schoolId?._id || sub.schoolId,
    schoolName: school?.name || 'School',
    planName: 'Recurring Subscription',
    ...patch,
  });
}

class RazorpayWebhookService {
  /**
   * Verify signature, dedupe by eventId, and store the raw event. Returns the
   * stored (or already-existing) RazorpayWebhookEvent document.
   * Throws AppError(401) on a bad signature — the caller must NOT process or
   * store anything for an unverified request.
   */
  async receive(rawBody, signatureHeader, headerEventId) {
    const valid = razorpaySubscriptionService.verifyWebhookSignature(rawBody, signatureHeader);
    if (!valid) {
      throw new AppError('Invalid webhook signature', 401);
    }

    let body;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new AppError('Malformed webhook payload', 400);
    }

    const eventId = deriveEventId(headerEventId, body);
    const existing = await RazorpayWebhookEvent.findOne({ eventId });
    if (existing) {
      return { event: existing, alreadyProcessed: existing.processed };
    }

    try {
      const created = await RazorpayWebhookEvent.create({ eventId, event: body.event, payload: body });
      return { event: created, alreadyProcessed: false };
    } catch (error) {
      if (error?.code === 11000) {
        // Lost a race with a concurrent delivery of the same event — treat as already handled.
        const raced = await RazorpayWebhookEvent.findOne({ eventId });
        return { event: raced, alreadyProcessed: true };
      }
      throw error;
    }
  }

  /** Process one stored webhook event. Safe to call more than once. */
  async process(webhookEventDoc) {
    if (webhookEventDoc.processed) return;
    const body = webhookEventDoc.payload;
    const eventName = body.event;

    try {
      const subEntity = body?.payload?.subscription?.entity;
      const paymentEntity = body?.payload?.payment?.entity;
      const invoiceEntity = body?.payload?.invoice?.entity;

      const razorpaySubscriptionId = subEntity?.id || paymentEntity?.subscription_id || invoiceEntity?.subscription_id;
      const sub = razorpaySubscriptionId ? await findSubscriptionByRazorpayId(razorpaySubscriptionId) : null;

      switch (eventName) {
        case 'subscription.authenticated':
          if (sub) await handleSubscriptionAuthenticated(sub, subEntity);
          break;
        case 'subscription.activated':
          if (sub) await handleSubscriptionActivated(sub, subEntity);
          break;
        case 'subscription.charged':
          if (sub) await handleSubscriptionCharged(sub, subEntity, paymentEntity, invoiceEntity);
          break;
        case 'subscription.pending':
          if (sub) await handleSubscriptionPending(sub, subEntity);
          break;
        case 'subscription.halted':
          if (sub) await handleSubscriptionHalted(sub, subEntity);
          break;
        case 'subscription.paused':
          if (sub) await handleSubscriptionPaused(sub);
          break;
        case 'subscription.resumed':
          if (sub) await handleSubscriptionResumed(sub, subEntity);
          break;
        case 'subscription.cancelled':
          if (sub) await handleSubscriptionCancelled(sub);
          break;
        case 'subscription.completed':
          if (sub) await handleSubscriptionCompleted(sub);
          break;
        case 'payment.failed':
          if (sub) await handlePaymentFailed(sub, paymentEntity);
          break;
        case 'payment.authorized':
        case 'payment.captured':
          // Authoritative recurring-payment recording happens on subscription.charged;
          // these are accepted (200) but intentionally no-ops here to avoid double-counting.
          break;
        case 'invoice.created':
        case 'invoice.issued':
          if (sub && invoiceEntity) await upsertInvoiceFromRazorpay(sub, invoiceEntity);
          break;
        case 'invoice.paid':
          if (sub && invoiceEntity) await upsertInvoiceFromRazorpay(sub, invoiceEntity, 'Paid');
          break;
        case 'invoice.partially_paid':
          if (sub && invoiceEntity) await upsertInvoiceFromRazorpay(sub, invoiceEntity, 'Pending');
          break;
        case 'invoice.expired':
          if (sub && invoiceEntity) await upsertInvoiceFromRazorpay(sub, invoiceEntity, 'Overdue');
          break;
        default:
          // Unknown/unhandled event type for this integration — store it (already done) and 200 it.
          break;
      }

      webhookEventDoc.processed = true;
      webhookEventDoc.processedAt = new Date();
      webhookEventDoc.failed = false;
      webhookEventDoc.failureReason = '';
      await webhookEventDoc.save();
    } catch (error) {
      webhookEventDoc.failed = true;
      webhookEventDoc.failureReason = error?.message || 'Unknown processing error';
      webhookEventDoc.retryCount = (webhookEventDoc.retryCount || 0) + 1;
      webhookEventDoc.nextRetryAt = new Date(Date.now() + Math.min(2 ** webhookEventDoc.retryCount, 60) * 60000);
      await webhookEventDoc.save();
      // Re-throw is intentionally NOT done — Razorpay must still get a 200 for a
      // signature-valid, well-formed event; our own recovery cron retries `failed` rows.
    }
  }
}

export const razorpayWebhookService = new RazorpayWebhookService();
