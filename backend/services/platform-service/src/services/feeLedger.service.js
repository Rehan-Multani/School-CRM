import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { feeRepository } from '../repositories/fee.repository.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { FeePayment } from '../models/FeePayment.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';

/**
 * Fee ledger — the ONE place a fee payment is recorded.
 *
 * Every path (accountant "pay invoice", school-admin "collect" against an
 * assignment, parent app Razorpay webhook) goes through `recordPayment`, so
 * each successful payment always produces, together:
 *   FeePayment (status COMPLETED, sequential receipt number)
 *   Receipt
 *   FinanceTransaction (INCOME, category "Fee Collection")
 * and the invoice / assignment balance is updated atomically.
 *
 * Mongo transactions need a replica set (not available on every deployment
 * or in the test runner), so consistency is kept by (1) an atomic guarded
 * `$inc` on the invoice that rejects overpayment and concurrent double
 * collection, and (2) compensation: if any later write fails, the invoice
 * `$inc` is reversed and every document created so far is deleted.
 */

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const PAYABLE = ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'];
const EPS = 0.005;
const startOfDayMs = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
};

async function ledgerCategory(schoolId, name, type) {
  let cat = await feeRepository.findFinanceCategoryByName(schoolId, name, type);
  if (!cat) {
    cat = await feeRepository
      .createFinanceCategory({ schoolId, name, type, description: `${name} (auto)`, status: 'ACTIVE' })
      .catch(async (err) => {
        if (err?.code !== 11000) throw err;
        return feeRepository.findFinanceCategoryByName(schoolId, name, type);
      });
  }
  return cat;
}

async function feeIncomeCategory(schoolId) {
  let cat = await feeRepository.findFinanceCategoryByName(schoolId, 'Fee Collection', 'INCOME');
  if (!cat) {
    cat = await feeRepository
      .createFinanceCategory({
        schoolId,
        name: 'Fee Collection',
        type: 'INCOME',
        description: 'Student fee collection',
        status: 'ACTIVE',
      })
      .catch(async (err) => {
        if (err?.code !== 11000) throw err;
        return feeRepository.findFinanceCategoryByName(schoolId, 'Fee Collection', 'INCOME');
      });
  }
  return cat;
}

async function resolveClassYear({ invoice, assignment, schoolId }) {
  let academicYearId = assignment?.academicYearId?._id || assignment?.academicYearId || invoice?.academicYearId?._id || invoice?.academicYearId || null;
  let classId = assignment?.classId?._id || assignment?.classId || null;
  const enrollmentId = assignment?.enrollmentId?._id || assignment?.enrollmentId || invoice?.enrollmentId?._id || invoice?.enrollmentId || null;
  if ((!classId || !academicYearId) && enrollmentId) {
    const enr = await StudentEnrollment.findOne({ _id: enrollmentId, schoolId: oid(schoolId) }).select('classId academicYearId').lean();
    if (enr) {
      classId = classId || enr.classId || null;
      academicYearId = academicYearId || enr.academicYearId || null;
    }
  }
  return { academicYearId, classId };
}

/**
 * Apply `amount` to an invoice.
 *  - manual: guarded — fails (returns null) if the balance is smaller or the
 *    invoice is not payable, so two concurrent collections cannot overpay.
 *  - gateway: the money has already been captured, so the payment is always
 *    applied; any excess over the balance is returned as `overpaid`.
 */
async function applyToInvoice(invoiceId, amount, { gateway }) {
  const inc = r2(amount);
  if (!gateway) {
    const updated = await FeeInvoice.findOneAndUpdate(
      { _id: invoiceId, status: { $in: PAYABLE }, balanceAmount: { $gte: inc - EPS } },
      { $inc: { paidAmount: inc, balanceAmount: -inc } },
      { new: true }
    );
    if (!updated) return null;
    return finalizeInvoiceStatus(updated, 0);
  }
  const invoice = await FeeInvoice.findById(invoiceId);
  if (!invoice) return null;
  const balance = r2(invoice.balanceAmount);
  const applied = Math.min(inc, Math.max(0, balance));
  const overpaid = r2(inc - applied);
  const updated = await FeeInvoice.findOneAndUpdate(
    { _id: invoiceId },
    { $inc: { paidAmount: inc, balanceAmount: -applied } },
    { new: true }
  );
  return finalizeInvoiceStatus(updated, overpaid);
}

async function finalizeInvoiceStatus(invoice, overpaid) {
  const paidAmount = r2(invoice.paidAmount);
  let balanceAmount = r2(invoice.balanceAmount);
  if (balanceAmount < EPS) balanceAmount = 0;
  const status = balanceAmount <= 0 ? 'PAID' : 'PARTIALLY_PAID';
  await FeeInvoice.updateOne({ _id: invoice._id }, { $set: { paidAmount, balanceAmount, status } });
  invoice.paidAmount = paidAmount;
  invoice.balanceAmount = balanceAmount;
  invoice.status = status;
  return { invoice, overpaid };
}

async function reverseInvoice(invoiceId, amount, applied) {
  const inc = r2(amount);
  const upd = await FeeInvoice.findOneAndUpdate(
    { _id: invoiceId },
    { $inc: { paidAmount: -inc, balanceAmount: r2(applied) } },
    { new: true }
  ).catch(() => null);
  if (upd) {
    const balance = r2(upd.balanceAmount);
    const status = balance <= 0 ? 'PAID' : r2(upd.paidAmount) > 0 ? 'PARTIALLY_PAID' : 'PENDING';
    await FeeInvoice.updateOne({ _id: invoiceId }, { $set: { balanceAmount: Math.max(0, balance), status } }).catch(() => {});
  }
}

export const feeLedgerService = {
  /**
   * Record one fee payment.
   * @param {object} p
   * @param {string} p.schoolId
   * @param {object} [p.invoice]      FeeInvoice document (invoice-based payment)
   * @param {object} [p.assignment]   StudentFeeAssignment document (assignment-based payment)
   * @param {number} p.amount         rupees
   * @param {string} p.paymentMethod
   * @param {Date}   [p.paymentDate]
   * @param {string} [p.reference]
   * @param {string} [p.remarks]
   * @param {string} [p.collectedBy]
   * @param {object} [p.gateway]      { name:'RAZORPAY', orderId, paymentId, paidByParentId }
   */
  async recordPayment(p) {
    const schoolId = String(p.schoolId);
    const amount = r2(p.amount);
    if (!(amount > 0)) throw new AppError('Payment amount must be greater than zero', 400, 'PAYMENT_INVALID_AMOUNT');
    const invoice = p.invoice || null;
    const assignment = p.assignment || null;
    if (!invoice && !assignment) throw new AppError('Nothing to apply the payment to', 400);

    const isGateway = Boolean(p.gateway?.paymentId);
    const paymentDate = p.paymentDate ? new Date(p.paymentDate) : new Date();
    const paymentMethod = String(p.paymentMethod || (isGateway ? 'ONLINE' : 'UPI')).toUpperCase();
    const studentId = oid(invoice ? invoice.studentId?._id || invoice.studentId : assignment.studentId?._id || assignment.studentId);

    const created = [];
    let invoiceApplied = 0;
    let overpaid = 0;
    let assignmentBefore = null;

    try {
      // 1. Apply to the invoice / assignment first (atomic guard for manual).
      if (invoice) {
        const res = await applyToInvoice(invoice._id, amount, { gateway: isGateway });
        if (!res) {
          const fresh = await FeeInvoice.findById(invoice._id).select('balanceAmount status').lean();
          if (!fresh || fresh.status === 'PAID' || (fresh.balanceAmount ?? 0) <= 0) {
            throw new AppError('This invoice has already been paid in full', 400, 'INVOICE_ALREADY_PAID');
          }
          if (!PAYABLE.includes(fresh.status)) {
            throw new AppError(`An invoice in "${fresh.status}" state cannot accept payments`, 400, 'INVOICE_NOT_PAYABLE');
          }
          throw new AppError(
            `Payment amount (₹${amount}) exceeds invoice remaining balance (₹${r2(fresh.balanceAmount)})`,
            400,
            'PAYMENT_INVALID_AMOUNT'
          );
        }
        overpaid = res.overpaid;
        invoiceApplied = r2(amount - overpaid);
        Object.assign(invoice, { paidAmount: res.invoice.paidAmount, balanceAmount: res.invoice.balanceAmount, status: res.invoice.status });
      } else {
        const due = r2(assignment.getDueAmount());
        if (amount > due + EPS) {
          throw new AppError(`Payment amount (₹${amount}) exceeds current due (₹${due})`, 400, 'PAYMENT_INVALID_AMOUNT');
        }
        assignmentBefore = { paidAmount: assignment.paidAmount, status: assignment.status };
        assignment.paidAmount = r2((assignment.paidAmount || 0) + amount);
        assignment.updateStatus();
        await assignment.save();
      }

      // 2. FeePayment with a sequential receipt number.
      const receiptNumber = await feeRepository.getNextReceiptNumber(schoolId);
      const payment = await feeRepository.createPayment({
        schoolId: oid(schoolId),
        invoiceId: invoice ? invoice._id : undefined,
        studentFeeAssignmentId: assignment ? assignment._id : undefined,
        studentId,
        receiptNumber,
        amount,
        paymentMethod,
        paymentMode: paymentMethod,
        paymentReference: p.reference || (isGateway ? p.gateway.paymentId : ''),
        referenceNo: p.reference || (isGateway ? p.gateway.paymentId : ''),
        paymentDate,
        transactionDate: paymentDate,
        remarks: p.remarks || (overpaid > 0 ? `Overpayment of ₹${overpaid} — refund due` : ''),
        notes: p.remarks || '',
        collectedBy: p.collectedBy || (isGateway ? 'Parent APK (online)' : 'Accounts Office'),
        status: 'COMPLETED',
        gateway: isGateway ? p.gateway.name || 'RAZORPAY' : 'MANUAL',
        gatewayOrderId: isGateway ? p.gateway.orderId || '' : '',
        gatewayPaymentId: isGateway ? p.gateway.paymentId : '',
        paidByParentId: p.gateway?.paidByParentId || null,
        overpaidAmount: overpaid,
        appliedAmount: invoice ? invoiceApplied : amount,
      });
      created.push(payment);

      // 3. Receipt.
      const { academicYearId, classId } = await resolveClassYear({ invoice, assignment, schoolId });
      const remainingDue = invoice ? r2(invoice.balanceAmount) : r2(assignment.getDueAmount());
      const receipt = await feeRepository.createReceipt({
        schoolId: oid(schoolId),
        receiptNumber,
        feePaymentId: payment._id,
        studentFeeAssignmentId: assignment ? assignment._id : null,
        invoiceId: invoice ? invoice._id : null,
        studentId,
        academicYearId: academicYearId || null,
        classId: classId || null,
        paidAmount: amount,
        paymentMode: paymentMethod,
        referenceNumber: payment.paymentReference || '',
        remainingDue,
        paymentDate,
      });
      created.push(receipt);

      // 4. Finance ledger (INCOME).
      const category = await feeIncomeCategory(schoolId);
      const student = invoice?.studentId?.firstName ? invoice.studentId : assignment?.studentId?.firstName ? assignment.studentId : null;
      const studentLabel = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() : String(studentId);
      const txn = await feeRepository.createFinanceTransaction({
        schoolId: oid(schoolId),
        transactionDate: paymentDate,
        transactionType: 'INCOME',
        categoryId: category._id,
        amount,
        paymentMode: paymentMethod,
        referenceNo: receiptNumber,
        description: `Fee payment - ${studentLabel}${invoice ? ` (${invoice.invoiceNumber})` : ''}`,
        feePaymentId: payment._id,
        receiptId: receipt._id,
      });
      created.push(txn);

      payment.receiptId = receipt._id;
      payment.financeTransactionId = txn._id;
      await payment.save();

      return { payment, receipt, financeTransaction: txn, invoice, assignment, overpaid };
    } catch (error) {
      // Compensation: undo whatever already landed.
      await Promise.all(created.map((doc) => doc.deleteOne().catch(() => {})));
      if (invoice && (invoiceApplied > 0 || overpaid > 0) && !(error?.code === 11000 && isGateway)) {
        await reverseInvoice(invoice._id, amount, invoiceApplied);
      } else if (invoice && error?.code === 11000 && isGateway) {
        // Duplicate gateway payment id: another delivery already recorded it.
        await reverseInvoice(invoice._id, amount, invoiceApplied);
      }
      if (assignment && assignmentBefore) {
        assignment.paidAmount = assignmentBefore.paidAmount;
        assignment.status = assignmentBefore.status;
        await assignment.save().catch(() => {});
      }
      throw error;
    }
  },

  /** Recompute an invoice's paid/balance/status from what its payments currently apply. */
  async recomputeInvoice(invoiceId) {
    const invoice = await FeeInvoice.findById(invoiceId);
    if (!invoice) return null;
    const agg = await FeePayment.aggregate([
      { $match: { invoiceId: invoice._id, status: { $in: ['COMPLETED', 'REFUNDED', 'CANCELLED'] } } },
      {
        $group: {
          _id: null,
          applied: {
            $sum: {
              $ifNull: ['$appliedAmount', { $subtract: ['$amount', { $ifNull: ['$overpaidAmount', 0] }] }],
            },
          },
        },
      },
    ]);
    const paidAmount = Math.max(0, r2(agg[0]?.applied || 0));
    const balanceAmount = Math.max(0, r2(invoice.totalAmount - paidAmount));
    const overdue = invoice.dueDate && startOfDayMs(invoice.dueDate) < startOfDayMs(new Date());
    const status = balanceAmount <= 0 ? 'PAID' : paidAmount > 0 ? 'PARTIALLY_PAID' : overdue && invoice.status === 'OVERDUE' ? 'OVERDUE' : 'PENDING';
    await FeeInvoice.updateOne({ _id: invoice._id }, { $set: { paidAmount, balanceAmount, status } });
    return { paidAmount, balanceAmount, status };
  },

  /**
   * Refund (money returned) or cancel (wrong entry) a payment, fully or partly.
   * - reduces the payment's applied amount (overpaid portion is refunded first)
   * - reopens the invoice balance accordingly
   * - writes an EXPENSE ledger row ("Fee Refunds" / "Fee Payment Reversal")
   * - voids the receipt on a full refund/cancel
   */
  async refundPayment(p) {
    const schoolId = String(p.schoolId);
    const payment = await FeePayment.findOne({ _id: p.paymentId, schoolId: oid(schoolId) });
    if (!payment) throw new AppError('Payment record not found', 404);
    if (!['COMPLETED', 'REFUNDED'].includes(payment.status)) {
      throw new AppError(`A payment in "${payment.status}" state cannot be refunded`, 400);
    }
    const kind = p.kind === 'CANCEL' ? 'CANCEL' : 'REFUND';
    const refundable = r2(payment.amount - (payment.refundedAmount || 0));
    if (refundable <= 0) throw new AppError('This payment has already been fully refunded', 400);
    const amount = p.amount === undefined || p.amount === null || p.amount === '' ? refundable : r2(p.amount);
    if (!(amount > 0)) throw new AppError('Refund amount must be greater than zero', 400);
    if (amount > refundable + EPS) throw new AppError(`Refund amount (₹${amount}) exceeds the refundable amount (₹${refundable})`, 400);
    if (kind === 'CANCEL' && amount < refundable - EPS) throw new AppError('A cancellation reverses the whole payment', 400);
    const reason = String(p.reason || '').trim();
    if (!reason) throw new AppError('A reason is required', 400);

    // Overpaid portion first (it never touched the invoice balance), then the applied portion.
    const fromOverpaid = Math.min(amount, r2(payment.overpaidAmount || 0));
    const fromApplied = r2(amount - fromOverpaid);
    const applied = payment.appliedAmount ?? r2(payment.amount - (payment.overpaidAmount || 0));

    if (payment.invoiceId && fromApplied > 0) {
      await FeeInvoice.updateOne({ _id: payment.invoiceId }, { $inc: { paidAmount: -fromApplied, balanceAmount: fromApplied } });
    }
    if (payment.studentFeeAssignmentId && fromApplied > 0) {
      const { StudentFeeAssignment } = await import('../models/StudentFeeAssignment.js');
      const a = await StudentFeeAssignment.findById(payment.studentFeeAssignmentId);
      if (a) {
        a.paidAmount = Math.max(0, r2((a.paidAmount || 0) - fromApplied));
        a.updateStatus();
        await a.save();
      }
    }

    const category = await ledgerCategory(schoolId, kind === 'CANCEL' ? 'Fee Payment Reversal' : 'Fee Refunds', 'EXPENSE');
    const txn = await feeRepository.createFinanceTransaction({
      schoolId: oid(schoolId),
      transactionDate: new Date(),
      transactionType: 'EXPENSE',
      categoryId: category._id,
      amount,
      paymentMode: String(p.method || payment.paymentMethod || '').toUpperCase(),
      referenceNo: `${kind}:${payment.receiptNumber}`,
      description: `${kind === 'CANCEL' ? 'Reversal' : 'Refund'} of receipt ${payment.receiptNumber} — ${reason}`,
      feePaymentId: payment._id,
      receiptId: payment.receiptId || null,
    });

    payment.refundedAmount = r2((payment.refundedAmount || 0) + amount);
    payment.overpaidAmount = r2((payment.overpaidAmount || 0) - fromOverpaid);
    payment.appliedAmount = r2(applied - fromApplied);
    payment.refunds.push({
      amount,
      kind,
      reason,
      method: String(p.method || '').toUpperCase(),
      reference: String(p.reference || ''),
      by: String(p.by || ''),
      financeTransactionId: txn._id,
    });
    const full = payment.refundedAmount >= payment.amount - EPS;
    if (full) payment.status = kind === 'CANCEL' ? 'CANCELLED' : 'REFUNDED';
    await payment.save();

    if (full && payment.receiptId) {
      const { Receipt } = await import('../models/Receipt.js');
      await Receipt.updateOne({ _id: payment.receiptId }, { $set: { status: 'VOID', voidReason: reason } }).catch(() => {});
    }
    let invoice = null;
    if (payment.invoiceId) invoice = await this.recomputeInvoice(payment.invoiceId);
    return { payment, refund: { amount, kind, fromOverpaid, fromApplied }, invoice };
  },
};
