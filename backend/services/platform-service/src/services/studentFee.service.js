import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { FeePayment } from '../models/FeePayment.js';
import { feeInvoiceLite, feeInvoiceDetail } from '../serializers/student.serializers.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const OUTSTANDING = ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'];

/**
 * Read-only fee information for the authenticated student. Every query is pinned
 * to `studentId = ctx.studentId`; there is no payment endpoint in this build
 * (see docs/student-apk-api.md "Deferred").
 */
class StudentFeeService {
  #scope(ctx) {
    return { schoolId: oid(ctx.schoolId), studentId: oid(ctx.studentId), status: { $ne: 'DRAFT' } };
  }

  async summary(ctx) {
    const invoices = await FeeInvoice.find(this.#scope(ctx)).lean();
    const totals = invoices.reduce(
      (acc, inv) => {
        acc.total += inv.totalAmount || 0;
        acc.paid += inv.paidAmount || 0;
        acc.balance += inv.balanceAmount || 0;
        return acc;
      },
      { total: 0, paid: 0, balance: 0 }
    );
    const nextDue = invoices
      .filter((i) => OUTSTANDING.includes(i.status) && i.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
    return {
      totalFees: totals.total,
      paid: totals.paid,
      pending: totals.balance,
      invoiceCount: invoices.length,
      outstandingCount: invoices.filter((i) => OUTSTANDING.includes(i.status)).length,
      nextDueDate: nextDue?.dueDate || null,
      nextDueAmount: nextDue?.balanceAmount || 0,
    };
  }

  async listInvoices(ctx, query = {}) {
    const filter = this.#scope(ctx);
    if (query.status) filter.status = String(query.status).toUpperCase().slice(0, 20);
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      FeeInvoice.find(filter).sort({ dueDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      FeeInvoice.countDocuments(filter),
    ]);
    return {
      data: rows.map(feeInvoiceLite),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async pendingInvoices(ctx) {
    const rows = await FeeInvoice.find({ ...this.#scope(ctx), status: { $in: OUTSTANDING } })
      .sort({ dueDate: 1 })
      .lean();
    return rows.map(feeInvoiceLite);
  }

  async getInvoice(ctx, id) {
    const inv = await FeeInvoice.findOne({ ...this.#scope(ctx), _id: oid(id) }).lean();
    if (!inv) throw new AppError('Invoice not found', 404, STUDENT_ERR.NOT_FOUND);
    const payments = await FeePayment.find({
      schoolId: oid(ctx.schoolId),
      studentId: oid(ctx.studentId),
      invoiceId: inv._id,
    })
      .sort({ paymentDate: -1 })
      .lean();
    return {
      ...feeInvoiceDetail(inv),
      payments: payments.map((p) => ({
        id: String(p._id),
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate,
        status: p.status,
      })),
    };
  }

  async history(ctx, query = {}) {
    const filter = { schoolId: oid(ctx.schoolId), studentId: oid(ctx.studentId) };
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      FeePayment.find(filter).sort({ paymentDate: -1 }).skip(skip).limit(limit).lean(),
      FeePayment.countDocuments(filter),
    ]);
    return {
      data: rows.map((p) => ({
        id: String(p._id),
        invoiceId: String(p.invoiceId),
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paymentReference: p.paymentReference || '',
        paymentDate: p.paymentDate,
        status: p.status,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

export const studentFeeService = new StudentFeeService();
