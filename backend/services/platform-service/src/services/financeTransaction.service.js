import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { feeRepository } from '../repositories/fee.repository.js';

function endOfDay(value) {
  const x = new Date(value);
  if (Number.isNaN(x.getTime())) return x;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) x.setHours(23, 59, 59, 999);
  return x;
}

export const financeTransactionService = {
  async listTransactions(schoolIdRaw, query = {}) {
    const schoolId = String(schoolIdRaw);
    if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
      throw new AppError('School context is missing', 401);
    }

    const filter = {};
    if (query.transactionType) filter.transactionType = String(query.transactionType).toUpperCase();
    if (query.categoryId) filter.categoryId = mongoose.isValidObjectId(query.categoryId) ? query.categoryId : null;
    
    if (query.startDate || query.endDate) {
      filter.transactionDate = {};
      if (query.startDate) filter.transactionDate.$gte = new Date(query.startDate);
      if (query.endDate) filter.transactionDate.$lte = endOfDay(query.endDate);
    }

    const transactions = await feeRepository.listFinanceTransactions(schoolId, filter);
    return transactions.map(t => t.toPublicJSON());
  },

  async getTransaction(schoolIdRaw, id) {
    const schoolId = String(schoolIdRaw);
    const txn = await feeRepository.getFinanceTransaction(schoolId, id);
    if (!txn) throw new AppError('Transaction not found', 404);
    return txn.toPublicJSON();
  },

  async getFinanceSummary(schoolIdRaw, query = {}) {
    const schoolId = String(schoolIdRaw);
    if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
      throw new AppError('School context is missing', 401);
    }

    const dateRange = {};
    if (query.startDate) dateRange.start = new Date(query.startDate);
    if (query.endDate) dateRange.end = endOfDay(query.endDate);

    const summary = await feeRepository.getFinanceSummary(schoolId, dateRange);
    
    let totalIncome = 0;
    let totalExpense = 0;

    for (const item of summary) {
      if (item._id === 'INCOME') totalIncome = item.total || 0;
      if (item._id === 'EXPENSE') totalExpense = item.total || 0;
    }

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
    };
  },

  async listIncomeCategories(schoolIdRaw) {
    const schoolId = String(schoolIdRaw);
    return (await feeRepository.listFinanceCategories(schoolId, { type: 'INCOME' }))
      .map(c => c.toPublicJSON());
  },

  async listExpenseCategories(schoolIdRaw) {
    const schoolId = String(schoolIdRaw);
    return (await feeRepository.listFinanceCategories(schoolId, { type: 'EXPENSE' }))
      .map(c => c.toPublicJSON());
  },

  async createExpenseCategory(schoolIdRaw, data = {}) {
    const schoolId = String(schoolIdRaw);
    const name = String(data.name || '').trim();
    if (!name) throw new AppError('Category name is required', 400);

    const category = await feeRepository.createFinanceCategory({
      schoolId,
      name,
      type: 'EXPENSE',
      description: data.description || '',
      status: 'ACTIVE',
    });

    return category.toPublicJSON();
  },

  async recordExpense(schoolIdRaw, data = {}) {
    const schoolId = String(schoolIdRaw);
    const categoryId = String(data.categoryId || '').trim();
    if (!categoryId || !mongoose.isValidObjectId(categoryId)) {
      throw new AppError('Valid category ID is required', 400);
    }

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError('Amount must be positive', 400);
    }

    const category = await feeRepository.getFinanceCategory(schoolId, categoryId);
    if (!category) throw new AppError('Category not found', 404);
    if (category.type !== 'EXPENSE') throw new AppError('Must be an expense category', 400);

    const transaction = await feeRepository.createFinanceTransaction({
      schoolId,
      transactionDate: data.transactionDate || new Date(),
      transactionType: 'EXPENSE',
      categoryId,
      amount,
      paymentMode: data.paymentMode || '',
      referenceNo: data.referenceNo || '',
      description: data.description || '',
      approvedBy: data.approvedBy || null,
    });

    return transaction.toPublicJSON();
  },
};
