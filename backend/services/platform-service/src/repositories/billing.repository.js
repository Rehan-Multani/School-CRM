import mongoose from 'mongoose';
import { Invoice } from '../models/Invoice.js';

export class BillingRepository {
  markOverdue() {
    return Invoice.updateMany(
      { status: 'Pending', dueAt: { $lt: new Date() } },
      { $set: { status: 'Overdue' } }
    );
  }

  async nextInvoiceNumber(year = new Date().getFullYear()) {
    const prefix = `INV-${year}-`;
    const last = await Invoice.findOne({ invoiceNumber: { $regex: `^${prefix}` } })
      .sort({ invoiceNumber: -1 })
      .select('invoiceNumber');

    let sequence = 1;
    if (last?.invoiceNumber) {
      const parsed = Number.parseInt(last.invoiceNumber.slice(prefix.length), 10);
      if (!Number.isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    return `${prefix}${String(sequence).padStart(4, '0')}`;
  }

  async list({ search, status, page = 1, limit = 8 }) {
    const query = {};

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { schoolName: { $regex: search, $options: 'i' } },
        { schoolCode: { $regex: search, $options: 'i' } },
        { planName: { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 8));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      Invoice.find(query).sort({ issuedAt: -1, createdAt: -1 }).skip(skip).limit(safeLimit),
      Invoice.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async stats() {
    const grouped = await Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    const byStatus = Object.fromEntries(
      grouped.map((row) => [row._id, { count: row.count, amount: row.amount }])
    );

    const value = (status) => byStatus[status] || { count: 0, amount: 0 };
    const paid = value('Paid');
    const pending = value('Pending');
    const overdue = value('Overdue');
    const refunded = value('Refunded');
    const failed = value('Failed');
    const cancelled = value('Cancelled');
    const totalCount = grouped.reduce((sum, row) => sum + row.count, 0);
    const totalAmount = grouped.reduce((sum, row) => sum + row.amount, 0);

    return {
      totalCount,
      totalAmount,
      collectedAmount: paid.amount,
      outstandingAmount: pending.amount + overdue.amount,
      paid: paid.count,
      pending: pending.count,
      overdue: overdue.count,
      refunded: refunded.count,
      failed: failed.count,
      cancelled: cancelled.count,
    };
  }

  create(payload) {
    return Invoice.create(payload);
  }

  findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Invoice.findById(id);
  }

  findOpenForSchoolPlan(schoolId, planName) {
    if (!mongoose.isValidObjectId(schoolId)) return null;
    return Invoice.findOne({
      school: schoolId,
      planName,
      status: { $in: ['Pending', 'Overdue'] },
    });
  }

  findLatestForSchool(schoolId, planName) {
    if (!mongoose.isValidObjectId(schoolId)) return null;
    const query = { school: schoolId };
    if (planName) {
      query.planName = planName;
    }
    return Invoice.findOne(query).sort({ issuedAt: -1, createdAt: -1 });
  }

  updateById(id, payload) {
    return Invoice.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  }

  count() {
    return Invoice.countDocuments();
  }
}

export const billingRepository = new BillingRepository();
