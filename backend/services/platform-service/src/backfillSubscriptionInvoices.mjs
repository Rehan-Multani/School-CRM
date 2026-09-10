/**
 * Backfill Invoice rows for recurring subscription payments that never got one.
 *
 * Invoices used to be created only when Razorpay delivered an `invoice.*` webhook
 * (or a `subscription.charged` payload that happened to embed `payload.invoice.entity`).
 * Charges recorded without either left the Super Admin → Subscriptions → Invoices
 * tab empty. `ensureInvoiceForCharge` now covers those cases going forward; this
 * script applies the same code path to payments already in the database.
 *
 * Idempotent — `ensureInvoiceForCharge` dedupes on razorpayInvoiceId / paymentReference,
 * so re-running it creates nothing new.
 *
 *   node src/backfillSubscriptionInvoices.mjs
 */
import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { SchoolSubscription } from './models/SchoolSubscription.js';
import { SubscriptionPayment } from './models/SubscriptionPayment.js';
import { Invoice } from './models/Invoice.js';
import { ensureInvoiceForCharge } from './services/razorpayWebhook.service.js';

await connectDB(env.mongoUri);

const payments = await SubscriptionPayment.find({ status: { $in: ['captured', 'authorized'] } }).sort({ createdAt: 1 });
console.log(`Found ${payments.length} recorded subscription payment(s).`);

const subCache = new Map();
async function loadSubscription(id) {
  const key = String(id);
  if (!subCache.has(key)) {
    subCache.set(
      key,
      await SchoolSubscription.findById(id)
        .populate('schoolId', 'name schoolId status')
        .populate('planId')
    );
  }
  return subCache.get(key);
}

let created = 0;
let skipped = 0;
let failed = 0;

for (const pay of payments) {
  const label = `payment ${pay.razorpayPaymentId || pay._id}`;

  // Already invoiced? Either by Razorpay invoice id or by our local payment reference.
  const existing = await Invoice.findOne({
    $or: [
      ...(pay.razorpayInvoiceId ? [{ razorpayInvoiceId: pay.razorpayInvoiceId }] : []),
      { paymentReference: pay.razorpayPaymentId },
    ],
  });
  if (existing) {
    skipped += 1;
    continue;
  }

  const sub = await loadSubscription(pay.subscriptionId);
  if (!sub) {
    console.log(`  ! ${label}: subscription ${pay.subscriptionId} not found — skipping`);
    failed += 1;
    continue;
  }

  const paidAt = pay.paidAt || pay.createdAt || new Date();
  try {
    const invoice = await ensureInvoiceForCharge(
      sub,
      {
        id: pay.razorpayPaymentId,
        amount: Math.round((pay.amount || 0) * 100),
        currency: pay.currency || 'INR',
        captured: pay.captured ?? pay.status === 'captured',
        method: pay.method || '',
        created_at: Math.floor(new Date(paidAt).getTime() / 1000),
        invoice_id: pay.razorpayInvoiceId || undefined,
      },
      null
    );
    if (invoice) {
      created += 1;
      console.log(`  + ${label} -> invoice ${invoice.invoiceNumber} (${invoice.status}, ₹${invoice.amount})`);
    } else {
      skipped += 1;
    }
  } catch (error) {
    failed += 1;
    console.log(`  ! ${label}: ${error?.message}`);
  }
}

console.log(`\ndone — ${created} created, ${skipped} already invoiced, ${failed} failed`);
process.exit(0);
