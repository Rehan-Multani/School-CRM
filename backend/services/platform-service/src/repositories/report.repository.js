import { School } from '../models/School.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { PlatformNotification } from '../models/PlatformNotification.js';
import { Invoice } from '../models/Invoice.js';

function schoolMatch({ search, status, plan, from, to }) {
  const and = [];

  if (search) {
    and.push({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { schoolId: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.state': { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (status && status !== 'All') {
    and.push({ status });
  }

  if (plan === 'Unassigned') {
    and.push({
      $or: [{ subscriptionPlan: '' }, { subscriptionPlan: null }, { subscriptionPlan: { $exists: false } }],
    });
  } else if (plan && plan !== 'All') {
    and.push({ subscriptionPlan: plan });
  }

  if (from || to) {
    const createdAt = {};
    if (from) createdAt.$gte = from;
    if (to) createdAt.$lte = to;
    and.push({ createdAt });
  }

  return and.length ? { $and: and } : {};
}

function notificationMatch({ from, to }) {
  if (!from && !to) return {};
  const createdAt = {};
  if (from) createdAt.$gte = from;
  if (to) createdAt.$lte = to;
  return { createdAt };
}

function invoiceMatch({ from, to, status }) {
  const query = {};
  if (status && status !== 'All') {
    query.status = status;
  }
  if (from || to) {
    query.issuedAt = {};
    if (from) query.issuedAt.$gte = from;
    if (to) query.issuedAt.$lte = to;
  }
  return query;
}

export class ReportRepository {
  listPlans() {
    return SubscriptionPlan.find().sort({ createdAt: -1 });
  }

  listSchools({ search, status, plan, from, to, page = 1, limit = 8 }) {
    const query = schoolMatch({ search, status, plan, from, to });
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(500, Math.max(1, Number(limit) || 8));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      School.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      School.countDocuments(query),
    ]).then(([items, total]) => ({
      items,
      total,
      page: safePage,
      limit: safeLimit,
    }));
  }

  recentSchools(filters, limit = 6) {
    return School.find(schoolMatch(filters)).sort({ createdAt: -1 }).limit(limit);
  }

  schoolTotals(filters) {
    return School.aggregate([
      { $match: schoolMatch(filters) },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          students: { $sum: { $ifNull: ['$stats.studentsCount', 0] } },
          staff: { $sum: { $ifNull: ['$stats.staffCount', 0] } },
          storage: { $sum: { $ifNull: ['$stats.storageUsed', 0] } },
        },
      },
    ]);
  }

  schoolsByStatus(filters) {
    return School.aggregate([
      { $match: schoolMatch(filters) },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  schoolsByPlan(filters) {
    return School.aggregate([
      { $match: schoolMatch(filters) },
      { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  schoolsByBoard(filters) {
    return School.aggregate([
      { $match: schoolMatch(filters) },
      { $group: { _id: '$board', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  schoolsByType(filters) {
    return School.aggregate([
      { $match: schoolMatch(filters) },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  schoolsByMonth(from) {
    const match = from ? { createdAt: { $gte: from } } : {};
    return School.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  billableByPlan(filters) {
    return School.aggregate([
      { $match: { ...schoolMatch(filters), status: 'Active' } },
      { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } },
    ]);
  }

  listNotifications({ from, to, page = 1, limit = 8 }) {
    const query = notificationMatch({ from, to });
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 8));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      PlatformNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      PlatformNotification.countDocuments(query),
    ]).then(([items, total]) => ({
      items,
      total,
      page: safePage,
      limit: safeLimit,
    }));
  }

  notificationTotals(filters) {
    return PlatformNotification.aggregate([
      { $match: notificationMatch(filters) },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          attempted: { $sum: { $ifNull: ['$delivery.attempted', 0] } },
          success: { $sum: { $ifNull: ['$delivery.success', 0] } },
          failed: { $sum: { $ifNull: ['$delivery.failed', 0] } },
        },
      },
    ]);
  }

  listInvoices({ from, to, status, page = 1, limit = 8 }) {
    const query = invoiceMatch({ from, to, status });
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(500, Math.max(1, Number(limit) || 8));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      Invoice.find(query).sort({ issuedAt: -1, createdAt: -1 }).skip(skip).limit(safeLimit),
      Invoice.countDocuments(query),
    ]).then(([items, total]) => ({
      items,
      total,
      page: safePage,
      limit: safeLimit,
    }));
  }

  invoiceTotals(filters) {
    return Invoice.aggregate([
      { $match: invoiceMatch(filters) },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);
  }

  invoicesByMonth(from) {
    const match = { status: 'Paid' };
    if (from) {
      match.paidAt = { $gte: from };
    }
    return Invoice.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m',
              date: { $ifNull: ['$paidAt', '$issuedAt'] },
            },
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}

export const reportRepository = new ReportRepository();
