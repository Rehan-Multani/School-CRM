import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { Invoice } from './models/Invoice.js';
import { School } from './models/School.js';
import { SubscriptionPlan } from './models/SubscriptionPlan.js';
import { billingRepository } from './repositories/billing.repository.js';

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export async function seedInvoices() {
  const existing = await Invoice.countDocuments();
  if (existing > 0) {
    return [];
  }

  const [schools, plans] = await Promise.all([
    School.find().sort({ createdAt: 1 }).limit(6),
    SubscriptionPlan.find().sort({ price: 1 }),
  ]);

  if (!schools.length || !plans.length) {
    return [];
  }

  const samples = [
    { schoolIndex: 0, planIndex: 2, status: 'Paid', issuedOffset: -32, dueOffset: -18, paidOffset: -17, method: 'UPI' },
    { schoolIndex: 1, planIndex: 1, status: 'Paid', issuedOffset: -20, dueOffset: -6, paidOffset: -6, method: 'Bank Transfer' },
    { schoolIndex: 2, planIndex: 1, status: 'Pending', issuedOffset: -4, dueOffset: 10, method: '' },
    { schoolIndex: 3, planIndex: 2, status: 'Overdue', issuedOffset: -40, dueOffset: -12, method: '' },
    { schoolIndex: 0, planIndex: 0, status: 'Failed', issuedOffset: -15, dueOffset: -1, method: 'Card' },
    { schoolIndex: 1, planIndex: 2, status: 'Refunded', issuedOffset: -50, dueOffset: -36, paidOffset: -35, refundOffset: -20, method: 'UPI' },
  ];

  const seeded = [];

  for (const sample of samples) {
    const school = schools[sample.schoolIndex] || schools[0];
    const plan = plans[Math.min(sample.planIndex, plans.length - 1)];
    const issuedAt = daysFromNow(sample.issuedOffset);
    const dueAt = daysFromNow(sample.dueOffset);
    const paidAt = typeof sample.paidOffset === 'number' ? daysFromNow(sample.paidOffset) : null;
    const refundedAt = typeof sample.refundOffset === 'number' ? daysFromNow(sample.refundOffset) : null;

    const invoice = await Invoice.create({
      invoiceNumber: await billingRepository.nextInvoiceNumber(issuedAt.getFullYear()),
      school: school._id,
      schoolName: school.name,
      schoolCode: school.code,
      planName: plan.name,
      planType: plan.planType,
      amount: plan.price,
      currency: 'INR',
      status: sample.status,
      issuedAt,
      dueAt,
      paidAt,
      refundedAt,
      paymentMethod: sample.method,
      notes: sample.status === 'Failed' ? 'Card payment declined by the bank.' : '',
      createdBy: 'seed',
    });

    seeded.push(invoice.toPublicJSON());
  }

  return seeded;
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seedInvoices.js');

if (isDirectRun) {
  connectDB(env.mongoUri)
    .then(() => seedInvoices())
    .then((invoices) => {
      console.log(`Seeded ${invoices.length} invoices`);
      invoices.forEach((invoice) => {
        console.log(`  ${invoice.invoiceNumber} · ${invoice.schoolName} · ${invoice.status}`);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('Invoice seed failed:', error.message);
      process.exit(1);
    });
}
