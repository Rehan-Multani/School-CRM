import crypto from 'crypto';
import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { env } from '../config/env.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { FeePayment } from '../models/FeePayment.js';
import { Student } from '../models/Student.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';
import { feeLedgerService } from './feeLedger.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const PAYABLE = ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'];

function paymentsConfigured() {
  return Boolean(env.razorpay?.keyId && env.razorpay?.keySecret);
}

function receiptDTO(payment, invoice) {
  const p = payment.toPublicJSON ? payment.toPublicJSON() : payment;
  const inv = invoice?.toPublicJSON ? invoice.toPublicJSON() : invoice;
  return {
    id: String(p.id || p._id),
    receiptNumber: p.receiptNumber,
    amount: p.amount,
    paymentMethod: p.paymentMethod,
    paymentDate: p.paymentDate,
    status: p.status,
    gateway: p.gateway || 'MANUAL',
    transactionId: p.gatewayPaymentId || p.paymentReference || '',
    invoice: inv
      ? {
          id: String(inv.id || inv._id),
          invoiceNumber: inv.invoiceNumber,
          periodLabel: inv.periodLabel,
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          balanceAmount: inv.balanceAmount,
          status: inv.status,
          items: (inv.items || []).map((it) => ({
            feeHeadName: it.feeHeadName,
            originalAmount: it.originalAmount ?? 0,
            discountAmount: it.discountAmount ?? 0,
            finalAmount: it.finalAmount ?? 0,
          })),
        }
      : null,
  };
}

class ParentFeePaymentService {
  /* -------------------------- create a Razorpay order -------------------------- */
  async createPayOrder(childCtx, parentCtx, invoiceId, body = {}) {
    if (!paymentsConfigured()) {
      throw new AppError('Online payments are not configured for this school', 400, PARENT_ERR.PAYMENTS_NOT_CONFIGURED);
    }
    const invoice = await FeeInvoice.findOne({
      _id: oid(invoiceId),
      schoolId: oid(childCtx.schoolId),
      studentId: oid(childCtx.studentId),
    });
    if (!invoice) throw new AppError('Invoice not found', 404, PARENT_ERR.NOT_FOUND);
    if (invoice.status === 'PAID' || invoice.balanceAmount <= 0) {
      throw new AppError('This invoice is already fully paid', 409, PARENT_ERR.INVOICE_ALREADY_PAID);
    }
    if (!PAYABLE.includes(invoice.status)) {
      throw new AppError(`An invoice in "${invoice.status}" state cannot be paid online`, 409, PARENT_ERR.INVOICE_NOT_PAYABLE);
    }

    let amount = Number(invoice.balanceAmount);
    if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
      const requested = Number(body.amount);
      if (!Number.isFinite(requested) || requested <= 0 || requested > invoice.balanceAmount + 0.001) {
        throw new AppError('Payment amount must be between 1 and the outstanding balance', 400, PARENT_ERR.PAYMENT_AMOUNT_INVALID);
      }
      amount = Math.round(requested * 100) / 100;
    }
    const amountPaise = Math.round(amount * 100);

    const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
    let order;
    try {
      const resp = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: `${invoice.invoiceNumber}-${Date.now().toString(36)}`.slice(0, 40),
          notes: {
            type: 'SCHOOL_FEE',
            schoolId: String(childCtx.schoolId),
            parentId: String(parentCtx.parentId),
            studentId: String(childCtx.studentId),
            invoiceId: String(invoice._id),
          },
        }),
      });
      order = await resp.json();
      if (!resp.ok || !order?.id) {
        throw new AppError(order?.error?.description || 'Unable to start the online payment', 502, PARENT_ERR.PAYMENT_GATEWAY_ERROR);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('Payment gateway is unreachable. Please try again.', 502, PARENT_ERR.PAYMENT_GATEWAY_ERROR);
    }

    await FeeInvoice.updateOne({ _id: invoice._id }, { $set: { lastPaymentOrderId: order.id } }).catch(() => {});

    return {
      keyId: env.razorpay.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || 'INR',
      invoiceId: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
      periodLabel: invoice.periodLabel,
      studentName: [childCtx.student?.firstName, childCtx.student?.lastName].filter(Boolean).join(' ').trim(),
      note: 'Payment is confirmed by the gateway webhook — do not treat the app callback as final.',
    };
  }

  /**
   * Client callback verification — signature only, ADVISORY. The authoritative
   * reconciliation is `reconcileFromRazorpay` driven by the webhook.
   */
  verifyClientCallback(body = {}) {
    if (!env.razorpay?.keySecret) {
      throw new AppError('Online payments are not configured', 400, PARENT_ERR.PAYMENTS_NOT_CONFIGURED);
    }
    const orderId = String(body.razorpay_order_id || body.razorpayOrderId || '').trim();
    const paymentId = String(body.razorpay_payment_id || body.razorpayPaymentId || '').trim();
    const signature = String(body.razorpay_signature || body.razorpaySignature || '').trim();
    if (!orderId || !paymentId || !signature) {
      throw new AppError('order id, payment id and signature are required', 400, PARENT_ERR.VALIDATION_ERROR);
    }
    const expected = crypto.createHmac('sha256', env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    const verified =
      expected.length === signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!verified) {
      throw new AppError('Payment signature is invalid', 400, PARENT_ERR.PAYMENT_SIGNATURE_INVALID);
    }
    return { verified: true, status: 'AWAITING_WEBHOOK', message: 'Payment received. Your receipt will appear once the bank confirms.' };
  }

  /* ----------------- webhook-driven reconciliation (authoritative) ----------------- */
  /**
   * Called from razorpayWebhook.service.js for payment.captured / order.paid.
   * `entity` is payload.payment.entity (preferred) or payload.order.entity.
   * Fully idempotent: the unique `gatewayPaymentId` index is the gate.
   */
  async reconcileFromRazorpay(entity = {}) {
    const notes = entity.notes || {};
    if (notes.type !== 'SCHOOL_FEE') return { handled: false };

    const paymentId = String(entity.id || '').trim();
    const orderId = String(entity.order_id || entity.id || '').trim();
    const amountPaise = Number(entity.amount || entity.amount_paid || 0);
    if (!paymentId || !notes.invoiceId || amountPaise <= 0) {
      return { handled: true, skipped: 'incomplete SCHOOL_FEE payment entity' };
    }

    const existing = await FeePayment.findOne({ gatewayPaymentId: paymentId }).lean();
    if (existing) return { handled: true, alreadyProcessed: true };

    const invoice = await FeeInvoice.findOne({ _id: notes.invoiceId, schoolId: notes.schoolId });
    if (!invoice) return { handled: true, skipped: `invoice ${notes.invoiceId} not found` };

    const amount = Math.round((amountPaise / 100) * 100) / 100;

    // Same ledger as every other payment: FeePayment (sequential receipt
    // number) + Receipt + FinanceTransaction. The unique gatewayPaymentId
    // index is the idempotency gate; a duplicate delivery is rolled back.
    let result;
    try {
      result = await feeLedgerService.recordPayment({
        schoolId: invoice.schoolId,
        invoice,
        amount,
        paymentMethod: 'ONLINE',
        paymentDate: new Date(),
        reference: paymentId,
        collectedBy: 'Parent APK (online)',
        gateway: {
          name: 'RAZORPAY',
          orderId,
          paymentId,
          paidByParentId: notes.parentId && mongoose.isValidObjectId(String(notes.parentId)) ? oid(notes.parentId) : null,
        },
      });
    } catch (err) {
      if (err?.code === 11000) return { handled: true, alreadyProcessed: true }; // raced with another delivery
      throw err;
    }

    // Defensive: recompute from ALL completed payments so a manual payment
    // that landed in between cannot leave the invoice drifted.
    const totals = await feeLedgerService.recomputeInvoice(invoice._id);

    return {
      handled: true,
      paymentId: String(result.payment._id),
      receiptNumber: result.payment.receiptNumber,
      invoiceStatus: totals?.status || invoice.status,
      overpaid: result.overpaid || 0,
    };
  }

  /* ------------------------------- receipts ------------------------------- */
  async listReceipts(childCtx, query = {}) {
    const filter = { schoolId: oid(childCtx.schoolId), studentId: oid(childCtx.studentId), status: 'COMPLETED' };
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      FeePayment.find(filter).sort({ paymentDate: -1 }).skip(skip).limit(limit),
      FeePayment.countDocuments(filter),
    ]);
    const invoiceIds = [...new Set(rows.map((r) => String(r.invoiceId)))];
    const invoices = invoiceIds.length
      ? await FeeInvoice.find({ _id: { $in: invoiceIds.map(oid) } })
      : [];
    const invById = new Map(invoices.map((i) => [String(i._id), i]));
    return {
      data: rows.map((r) => receiptDTO(r, invById.get(String(r.invoiceId)))),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getReceipt(childCtx, paymentId) {
    const payment = await FeePayment.findOne({
      _id: oid(paymentId),
      schoolId: oid(childCtx.schoolId),
      studentId: oid(childCtx.studentId),
    });
    if (!payment) throw new AppError('Receipt not found', 404, PARENT_ERR.NOT_FOUND);
    const invoice = await FeeInvoice.findById(payment.invoiceId);
    return receiptDTO(payment, invoice);
  }
}

export const parentFeePaymentService = new ParentFeePaymentService();
