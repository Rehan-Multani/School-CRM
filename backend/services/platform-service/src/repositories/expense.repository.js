import mongoose from 'mongoose';
import { Expense } from '../models/Expense.js';
import { escapeRegex } from '../../../shared/sanitize.js';

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

export class ExpenseRepository {
  list(schoolId, { search, category, paymentStatus, approvalStatus, dateFrom, dateTo, page = 1, limit = 20 } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (category) query.category = category;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (dateFrom || dateTo) {
      query.expenseDate = {};
      if (dateFrom) query.expenseDate.$gte = new Date(dateFrom);
      if (dateTo) query.expenseDate.$lte = new Date(dateTo);
    }
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { expenseNumber: { $regex: safe, $options: 'i' } },
        { title: { $regex: safe, $options: 'i' } },
        { category: { $regex: safe, $options: 'i' } },
        { vendorName: { $regex: safe, $options: 'i' } },
        { reference: { $regex: safe, $options: 'i' } },
      ];
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      Expense.find(query).sort({ expenseDate: -1, createdAt: -1 }).skip(skip).limit(safeLimit),
      Expense.countDocuments(query),
    ]).then(([items, total]) => ({ items, total, page: safePage, limit: safeLimit }));
  }

  findById(schoolId, id) {
    return Expense.findOne({ _id: id, schoolId: toObjectId(schoolId) });
  }

  create(payload) {
    return Expense.create(payload);
  }

  update(schoolId, id, payload) {
    return Expense.findOneAndUpdate({ _id: id, schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  remove(schoolId, id) {
    return Expense.findOneAndDelete({ _id: id, schoolId: toObjectId(schoolId) });
  }

  distinctCategories(schoolId) {
    return Expense.distinct('category', { schoolId: toObjectId(schoolId) });
  }

  async getNextExpenseNumber(schoolId) {
    const year = new Date().getFullYear();
    const count = await Expense.countDocuments({ schoolId: toObjectId(schoolId) });
    return `EXP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  aggregateTotals(schoolId, { dateFrom, dateTo } = {}) {
    const match = { schoolId: toObjectId(schoolId) };
    if (dateFrom || dateTo) {
      match.expenseDate = {};
      if (dateFrom) match.expenseDate.$gte = new Date(dateFrom);
      if (dateTo) match.expenseDate.$lte = new Date(dateTo);
    }
    return Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]).then((rows) => rows[0] || { totalAmount: 0, count: 0 });
  }

  aggregateByCategory(schoolId, { dateFrom, dateTo } = {}) {
    const match = { schoolId: toObjectId(schoolId) };
    if (dateFrom || dateTo) {
      match.expenseDate = {};
      if (dateFrom) match.expenseDate.$gte = new Date(dateFrom);
      if (dateTo) match.expenseDate.$lte = new Date(dateTo);
    }
    return Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);
  }
}

export const expenseRepository = new ExpenseRepository();
