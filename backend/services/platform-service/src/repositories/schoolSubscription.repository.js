import mongoose from 'mongoose';
import { SchoolSubscription, ACTIVE_LIKE_STATUSES } from '../models/SchoolSubscription.js';
import { SubscriptionPayment } from '../models/SubscriptionPayment.js';
import { SubscriptionHistory } from '../models/SubscriptionHistory.js';
import { Invoice } from '../models/Invoice.js';
import { sanitizePagination } from '../../../shared/sanitize.js';

class SchoolSubscriptionRepository {
  countByPlan(planId) {
    return SchoolSubscription.countDocuments({ $or: [{ planId }, { pendingPlanId: planId }] });
  }

  findActiveLikeForSchool(schoolId) {
    return SchoolSubscription.findOne({
      schoolId,
      status: { $in: ACTIVE_LIKE_STATUSES },
    });
  }

  findById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return SchoolSubscription.findById(id).populate('planId').populate('pendingPlanId');
  }

  findByRazorpayId(razorpaySubscriptionId) {
    return SchoolSubscription.findOne({ razorpaySubscriptionId });
  }

  findForSchool(schoolId) {
    return SchoolSubscription.findOne({ schoolId }).sort({ createdAt: -1 }).populate('planId').populate('pendingPlanId');
  }

  create(data) {
    return SchoolSubscription.create(data);
  }

  async save(doc) {
    return doc.save();
  }

  updateById(id, patch) {
    return SchoolSubscription.findByIdAndUpdate(id, { $set: patch }, { new: true }).populate('planId');
  }

  async list(query = {}) {
    const filter = {};
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.schoolId) filter.schoolId = query.schoolId;
    if (query.planId) filter.planId = query.planId;

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 25,
      maxLimit: 100,
    });

    const [items, total] = await Promise.all([
      SchoolSubscription.find(filter)
        .populate('planId')
        .populate('schoolId', 'name schoolId logoUrl status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SchoolSubscription.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // ---- payments ----
  createPayment(data) {
    return SubscriptionPayment.create(data);
  }
  findPaymentByRazorpayId(razorpayPaymentId) {
    return SubscriptionPayment.findOne({ razorpayPaymentId });
  }
  async listPayments(subscriptionId, query = {}) {
    const filter = { subscriptionId };
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 25, maxLimit: 100 });
    const [items, total] = await Promise.all([
      SubscriptionPayment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      SubscriptionPayment.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  // ---- invoices (reuse existing Invoice collection) ----
  async listInvoicesForSubscription(subscriptionId, query = {}) {
    const filter = { subscriptionId };
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 25, maxLimit: 100 });
    const [items, total] = await Promise.all([
      Invoice.find(filter).sort({ issuedAt: -1 }).skip(skip).limit(limit),
      Invoice.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
  findInvoiceByRazorpayId(razorpayInvoiceId) {
    return Invoice.findOne({ razorpayInvoiceId });
  }
  createInvoice(data) {
    return Invoice.create(data);
  }
  updateInvoiceById(id, patch) {
    return Invoice.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  // ---- history ----
  recordHistory(data) {
    return SubscriptionHistory.create(data).catch(() => null); // history must never break the caller
  }
  async listHistory(subscriptionId, query = {}) {
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 50, maxLimit: 200 });
    const [items, total] = await Promise.all([
      SubscriptionHistory.find({ subscriptionId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      SubscriptionHistory.countDocuments({ subscriptionId }),
    ]);
    return { items, total, page, limit };
  }

  // ---- dashboard aggregation ----
  async stats() {
    const [byStatus, mrrAgg, arrAgg, failedCount] = await Promise.all([
      SchoolSubscription.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      SchoolSubscription.aggregate([
        { $match: { status: 'active' } },
        {
          $lookup: { from: 'subscriptionplans', localField: 'planId', foreignField: '_id', as: 'plan' },
        },
        { $unwind: '$plan' },
        { $match: { 'plan.billingInterval': 'monthly' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      SchoolSubscription.aggregate([
        { $match: { status: 'active' } },
        {
          $lookup: { from: 'subscriptionplans', localField: 'planId', foreignField: '_id', as: 'plan' },
        },
        { $unwind: '$plan' },
        { $match: { 'plan.billingInterval': 'yearly' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      SchoolSubscription.countDocuments({ status: 'halted' }),
    ]);
    const statusMap = {};
    byStatus.forEach((s) => (statusMap[s._id] = s.count));
    return {
      byStatus: statusMap,
      mrr: mrrAgg[0]?.total || 0,
      arr: (arrAgg[0]?.total || 0) + (mrrAgg[0]?.total || 0) * 12,
      pastDue: statusMap.halted || 0,
      failedPayments: failedCount,
    };
  }

  // ---- reconciliation / cron query helpers ----
  findExpiredNotMarked(now) {
    return SchoolSubscription.find({
      status: { $in: ['active', 'halted'] },
      currentPeriodEnd: { $lt: now },
      cancelAtPeriodEnd: true,
    });
  }
  findPastGracePeriod(now) {
    return SchoolSubscription.find({
      status: { $in: ['halted', 'pending'] },
      gracePeriodEndsAt: { $ne: null, $lt: now },
    });
  }
  findStale(before) {
    return SchoolSubscription.find({
      status: { $in: ['created', 'authenticated', 'pending'] },
      createdAt: { $lt: before },
    });
  }
  findNeedingReconciliation(staleBefore) {
    return SchoolSubscription.find({
      status: { $in: ACTIVE_LIKE_STATUSES },
      razorpaySubscriptionId: { $ne: '' },
      $or: [{ lastReconciledAt: null }, { lastReconciledAt: { $lt: staleBefore } }],
    }).limit(200);
  }

  findFailuresPendingNotification() {
    return SchoolSubscription.find({
      status: { $in: ['pending', 'halted'] },
      failureCount: { $gt: 0 },
      $or: [
        { lastFailureNotifiedAt: null },
        { $expr: { $lt: ['$lastFailureNotifiedAt', '$lastFailureAt'] } },
      ],
    }).limit(200);
  }
}

export const schoolSubscriptionRepository = new SchoolSubscriptionRepository();
