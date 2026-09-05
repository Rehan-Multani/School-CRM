import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { AppError } from '../../../shared/AppError.js';

let client = null;
function getClient() {
  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    throw new AppError('Razorpay is not configured on this server', 503);
  }
  if (!client) {
    client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  }
  return client;
}

function wrap(promise, action) {
  return promise.catch((error) => {
    // The SDK's error shape varies: validation errors are usually
    // { error: { description, code } }, auth errors can be { error: "Unauthorized" }
    // (a plain string), and some failures only set statusCode/message.
    const rzpError = error?.error;
    const desc =
      (typeof rzpError === 'string' && rzpError) ||
      rzpError?.description ||
      error?.message ||
      (error?.statusCode === 401 ? 'Unauthorized — check RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET' : '') ||
      'Razorpay request failed';
    const statusCode = error?.statusCode && error.statusCode >= 400 && error.statusCode < 500 ? 400 : 502;
    // eslint-disable-next-line no-console
    console.error(`[razorpay] ${action} failed (${error?.statusCode || '?'}): ${desc}`);
    throw new AppError(`Razorpay ${action} failed: ${desc}`, statusCode);
  });
}

/**
 * All Razorpay Subscriptions-API calls are centralized here. Nothing else in
 * the codebase should import the `razorpay` package directly. The existing
 * one-time Orders flow in billing.service.js is untouched — different product,
 * different lifecycle, left as-is per "don't touch working code".
 */
export const razorpaySubscriptionService = {
  isConfigured() {
    return Boolean(env.razorpay.keyId && env.razorpay.keySecret);
  },
  webhookConfigured() {
    return Boolean(env.razorpay.webhookSecret);
  },
  publicKeyId() {
    return env.razorpay.keyId || '';
  },

  // ---- Plans ----
  async createPlan({ interval, intervalCount, amountPaise, currency, name, description }) {
    const client = getClient();
    return wrap(
      client.plans.create({
        period: interval, // 'monthly' | 'yearly'
        interval: intervalCount || 1,
        item: {
          name,
          description: description || undefined,
          amount: amountPaise,
          currency: currency || 'INR',
        },
      }),
      'plan creation'
    );
  },

  async fetchPlan(razorpayPlanId) {
    const client = getClient();
    return wrap(client.plans.fetch(razorpayPlanId), 'plan fetch');
  },

  // ---- Customers ----
  /**
   * IMPORTANT: Razorpay's API only honors `fail_existing` as the STRING '0'
   * or '1' — passing the number 0 is silently treated as truthy (same as
   * '1'), so it ALWAYS throws "Customer already exists" instead of handing
   * back the existing record. That was the bug here: every second call for
   * the same email/contact hit the catch branch below, which used to paper
   * over it by grabbing `customers.all({ count: 1 })` — the single most
   * recently created customer *in the whole merchant account*, with no
   * filter at all. That can (and, in this project's dev data, did) hand one
   * school's subscription a completely unrelated school's customer record.
   * With the string fixed, Razorpay returns the correct existing customer
   * directly from `create()` and the catch branch should never fire in
   * normal operation — it now fails loudly instead of guessing if it ever
   * does, since a wrong guess here is worse than an error.
   */
  async findOrCreateCustomer({ name, email, contact, notes }) {
    const client = getClient();
    try {
      return await client.customers.create({ name, email, contact, notes, fail_existing: '0' });
    } catch (error) {
      const desc = error?.error?.description || '';
      throw new AppError(`Razorpay customer creation failed: ${desc || error.message}`, 502);
    }
  },

  // ---- Subscriptions ----
  async createSubscription({ razorpayPlanId, customerId, totalCount, quantity, startAt, customerNotify, notes, addons }) {
    const client = getClient();
    const payload = {
      plan_id: razorpayPlanId,
      customer_notify: customerNotify === false ? 0 : 1,
      quantity: quantity || 1,
      notes: notes || {},
    };
    // Without this, Razorpay leaves customer_id null on the subscription and
    // decides the customer solely from whatever gets entered at checkout —
    // the customer we just found/created via findOrCreateCustomer was never
    // actually attached to anything. Confirmed against live subscriptions in
    // this project's own dev data before this fix.
    if (customerId) payload.customer_id = customerId;
    if (totalCount) payload.total_count = totalCount;
    if (startAt) payload.start_at = Math.floor(new Date(startAt).getTime() / 1000);
    if (Array.isArray(addons) && addons.length) payload.addons = addons;
    return wrap(client.subscriptions.create(payload), 'subscription creation');
  },

  async fetchSubscription(razorpaySubscriptionId) {
    const client = getClient();
    return wrap(client.subscriptions.fetch(razorpaySubscriptionId), 'subscription fetch');
  },

  /**
   * Plan change. Razorpay applies `schedule_change_at: 'now'` immediately
   * (used for upgrades) or `'cycle_end'` to defer to the next billing cycle
   * (used for downgrades).
   */
  async updateSubscriptionPlan(razorpaySubscriptionId, { razorpayPlanId, quantity, scheduleChangeAt }) {
    const client = getClient();
    return wrap(
      client.subscriptions.update(razorpaySubscriptionId, {
        plan_id: razorpayPlanId,
        quantity: quantity || 1,
        schedule_change_at: scheduleChangeAt || 'now',
      }),
      'subscription plan change'
    );
  },

  async cancelSubscription(razorpaySubscriptionId, { atCycleEnd = false } = {}) {
    const client = getClient();
    return wrap(
      client.subscriptions.cancel(razorpaySubscriptionId, atCycleEnd),
      'subscription cancellation'
    );
  },

  async pauseSubscription(razorpaySubscriptionId) {
    const client = getClient();
    return wrap(client.subscriptions.pause(razorpaySubscriptionId, { pause_at: 'now' }), 'subscription pause');
  },

  async resumeSubscription(razorpaySubscriptionId) {
    const client = getClient();
    return wrap(client.subscriptions.resume(razorpaySubscriptionId, { resume_at: 'now' }), 'subscription resume');
  },

  // ---- Payments / Invoices (read-only lookups for reconciliation) ----
  async fetchPayment(razorpayPaymentId) {
    const client = getClient();
    return wrap(client.payments.fetch(razorpayPaymentId), 'payment fetch');
  },

  async fetchInvoice(razorpayInvoiceId) {
    const client = getClient();
    return wrap(client.invoices.fetch(razorpayInvoiceId), 'invoice fetch');
  },

  // ---- Webhook signature verification ----
  /**
   * `rawBody` MUST be the exact bytes Razorpay sent (Buffer or string) —
   * verifying a re-serialized JSON object will fail even for a legitimate event.
   */
  verifyWebhookSignature(rawBody, signatureHeader) {
    if (!env.razorpay.webhookSecret) {
      throw new AppError('Webhook secret not configured', 503);
    }
    if (!signatureHeader) return false;
    const expected = crypto
      .createHmac('sha256', env.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false; // length mismatch etc. -> not equal
    }
  },
};
