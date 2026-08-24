import mongoose from 'mongoose';
import crypto from 'crypto';
import { AppError } from '../../../shared/AppError.js';
import { env } from '../config/env.js';
import {
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  PLAN_TYPES,
} from '../models/Invoice.js';
import { billingRepository } from '../repositories/billing.repository.js';
import { schoolRepository } from '../repositories/school.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { planEndDate } from '../utils/subscription.utils.js';

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new AppError(`${label} is required`, 400);
  }
  return text;
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireId(id, label) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError(`${label} not found`, 404);
  }
  return id;
}

function normalizeAmount(value) {
  const amount = Number(value);
  if (Number.isNaN(amount) || amount < 0) {
    throw new AppError('Amount must be a valid number', 400);
  }
  return Math.round(amount * 100) / 100;
}

function normalizeDate(value, label, fallback) {
  if (!value && fallback) {
    return fallback;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${label} must be a valid date`, 400);
  }
  return date;
}

function normalizeStatus(value, fallback = 'Pending') {
  const text = optionalText(value) || fallback;
  const match = INVOICE_STATUSES.find((status) => status.toLowerCase() === text.toLowerCase());
  if (!match) {
    throw new AppError('Invoice status is invalid', 400);
  }
  return match;
}

function normalizePlanType(value) {
  const text = optionalText(value) || 'Monthly';
  const match = PLAN_TYPES.find((type) => type.toLowerCase() === text.toLowerCase());
  if (!match) {
    throw new AppError('Plan type must be Weekly, Monthly, or Yearly', 400);
  }
  return match;
}

function normalizePaymentMethod(value, required = false) {
  const text = optionalText(value);
  if (!text) {
    if (required) {
      throw new AppError('Payment method is required', 400);
    }
    return '';
  }
  const match = PAYMENT_METHODS.find((method) => method.toLowerCase() === text.toLowerCase());
  if (!match) {
    throw new AppError('Payment method is invalid', 400);
  }
  return match;
}

export class BillingService {
  async listInvoices(filters) {
    await billingRepository.markOverdue();
    const [{ items, total, page, limit }, stats] = await Promise.all([
      billingRepository.list(filters),
      billingRepository.stats(),
    ]);

    return {
      data: items.map((invoice) => invoice.toPublicJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit) || 1),
      },
      stats,
    };
  }

  async createInvoice(payload, createdBy) {
    const schoolId = requireId(payload?.schoolId, 'School');
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }

    let planName = optionalText(payload?.planName) || optionalText(school.subscriptionPlan);
    let planType = optionalText(payload?.planType);
    let amount = payload?.amount;

    if (planName) {
      const plans = await subscriptionRepository.list();
      const plan = plans.find((item) => item.name.toLowerCase() === planName.toLowerCase());
      if (plan) {
        planName = plan.name;
        planType = planType || plan.planType;
        if (amount === '' || amount === null || typeof amount === 'undefined') {
          amount = plan.price;
        }
      }
    }

    if (!planName) {
      throw new AppError('Subscription plan is required', 400);
    }

    const issuedAt = normalizeDate(payload?.issuedAt, 'Issued date', new Date());
    const dueAt = normalizeDate(payload?.dueAt, 'Due date');
    if (dueAt < issuedAt) {
      throw new AppError('Due date cannot be earlier than the issued date', 400);
    }

    const status = normalizeStatus(payload?.status, 'Pending');
    const paidNow = status === 'Paid';

    const invoice = await billingRepository.create({
      invoiceNumber: await billingRepository.nextInvoiceNumber(),
      school: school._id,
      schoolName: school.name,
      schoolCode: school.code,
      planName,
      planType: normalizePlanType(planType),
      amount: normalizeAmount(amount),
      currency: 'INR',
      status,
      issuedAt,
      dueAt,
      paidAt: paidNow ? normalizeDate(payload?.paidAt, 'Paid date', new Date()) : null,
      refundedAt: null,
      paymentMethod: normalizePaymentMethod(payload?.paymentMethod, paidNow),
      notes: optionalText(payload?.notes),
      createdBy: createdBy || null,
    });

    return invoice.toPublicJSON();
  }

  async getInvoice(id) {
    requireId(id, 'Invoice');
    await billingRepository.markOverdue();
    const invoice = await billingRepository.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    return invoice.toPublicJSON();
  }

  async markPaid(id, payload = {}) {
    requireId(id, 'Invoice');
    const invoice = await billingRepository.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (!['Pending', 'Overdue', 'Failed'].includes(invoice.status)) {
      throw new AppError('Only pending, overdue, or failed invoices can be marked as paid', 400);
    }

    const paidAt = normalizeDate(payload?.paidAt, 'Paid date', new Date());
    const updated = await billingRepository.updateById(id, {
      status: 'Paid',
      paidAt,
      paymentMethod: normalizePaymentMethod(payload?.paymentMethod || invoice.paymentMethod, true),
      paymentReference: optionalText(payload?.paymentReference) || invoice.paymentReference || '',
    });

    if (invoice.school) {
      const school = await schoolRepository.findById(invoice.school);
      if (school && school.subscriptionPlan === invoice.planName) {
        const planType = invoice.planType || school.subscription?.planType || 'Monthly';
        school.subscription = {
          planId: school.subscription?.planId || null,
          planType,
          startedAt: paidAt,
          endsAt: planEndDate(paidAt, planType),
          status: 'Active',
        };
        await school.save();
      }
    }

    return updated.toPublicJSON();
  }

  async refundInvoice(id) {
    requireId(id, 'Invoice');
    const invoice = await billingRepository.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (invoice.status !== 'Paid') {
      throw new AppError('Only paid invoices can be refunded', 400);
    }

    const updated = await billingRepository.updateById(id, {
      status: 'Refunded',
      refundedAt: new Date(),
    });

    return updated.toPublicJSON();
  }

  async cancelInvoice(id) {
    requireId(id, 'Invoice');
    const invoice = await billingRepository.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (!['Pending', 'Overdue', 'Failed'].includes(invoice.status)) {
      throw new AppError('Only unpaid invoices can be cancelled', 400);
    }

    const updated = await billingRepository.updateById(id, { status: 'Cancelled' });
    return updated.toPublicJSON();
  }

  gatewayStatus() {
    const configured = Boolean(env.razorpay.keyId && env.razorpay.keySecret);
    return {
      razorpay: configured,
      keyId: configured ? env.razorpay.keyId : '',
    };
  }

  async ensureSubscriptionInvoice(school, createdBy) {
    const planName = optionalText(school?.subscriptionPlan);
    if (!planName) return null;

    const open = await billingRepository.findOpenForSchoolPlan(school._id, planName);
    if (open) return open.toPublicJSON();

    const dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 14);

    return this.createInvoice(
      {
        schoolId: school._id.toString(),
        planName,
        issuedAt: new Date().toISOString(),
        dueAt: dueAt.toISOString(),
        status: 'Pending',
      },
      createdBy
    );
  }

  async createRazorpayOrder(id) {
    if (!env.razorpay.keyId || !env.razorpay.keySecret) {
      throw new AppError('Online payments are not configured', 400);
    }

    requireId(id, 'Invoice');
    const invoice = await billingRepository.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }
    if (!['Pending', 'Overdue', 'Failed'].includes(invoice.status)) {
      throw new AppError('Only unpaid invoices can be collected online', 400);
    }

    const amountPaise = Math.round(Number(invoice.amount) * 100);
    const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: invoice.currency || 'INR',
        receipt: invoice.invoiceNumber,
        notes: { invoiceId: invoice._id.toString() },
      }),
    });

    const order = await response.json();
    if (!response.ok || !order?.id) {
      throw new AppError(order?.error?.description || 'Unable to start online payment', 502);
    }

    await billingRepository.updateById(id, { razorpayOrderId: order.id });

    return {
      keyId: env.razorpay.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      invoice: {
        id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        schoolName: invoice.schoolName,
      },
    };
  }

  async verifyRazorpayPayment(id, payload = {}) {
    if (!env.razorpay.keySecret) {
      throw new AppError('Online payments are not configured', 400);
    }

    const orderId = requireText(payload?.razorpayOrderId || payload?.razorpay_order_id, 'Razorpay order id');
    const paymentId = requireText(payload?.razorpayPaymentId || payload?.razorpay_payment_id, 'Razorpay payment id');
    const signature = requireText(payload?.razorpaySignature || payload?.razorpay_signature, 'Razorpay signature');

    const expected = crypto
      .createHmac('sha256', env.razorpay.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expected !== signature) {
      throw new AppError('Payment signature is invalid', 400);
    }

    return this.markPaid(id, {
      paymentMethod: 'Online',
      paymentReference: paymentId,
    });
  }
}

export const billingService = new BillingService();
