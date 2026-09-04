import { AppError } from '../../../shared/AppError.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import {
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_PAYMENT_STATUSES,
  EXPENSE_APPROVAL_STATUSES,
} from '../models/Expense.js';

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  return text;
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureOption(value, options, label, fallback) {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback;
    throw new AppError(`${label} is required`, 400);
  }
  const text = String(value).trim().toUpperCase();
  if (!options.includes(text)) throw new AppError(`${label} is invalid`, 400);
  return text;
}

function ensureNumber(value, label, min = 0) {
  const num = Number(value);
  if (Number.isNaN(num) || num < min) throw new AppError(`${label} must be a number >= ${min}`, 400);
  return num;
}

function paginate(result) {
  return {
    data: result.items.map((item) => item.toPublicJSON()),
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / result.limit)),
    },
  };
}

export class ExpenseService {
  async listExpenses(schoolId, query = {}) {
    const result = await expenseRepository.list(schoolId, query);
    return paginate(result);
  }

  async getExpense(schoolId, id) {
    const expense = await expenseRepository.findById(schoolId, id);
    if (!expense) throw new AppError('Expense not found', 404);
    return expense.toPublicJSON();
  }

  async createExpense(schoolId, payload = {}, createdBy = '') {
    const category = requireText(payload.category, 'Category');
    const title = requireText(payload.title, 'Title');
    const amount = ensureNumber(payload.amount, 'Amount', 0.01);
    const paymentMethod = ensureOption(payload.paymentMethod, EXPENSE_PAYMENT_METHODS, 'Payment Method', 'CASH');
    const paymentStatus = ensureOption(payload.paymentStatus, EXPENSE_PAYMENT_STATUSES, 'Payment Status', 'PAID');
    const approvalStatus = ensureOption(payload.approvalStatus, EXPENSE_APPROVAL_STATUSES, 'Approval Status', 'APPROVED');

    const expenseNumber = await expenseRepository.getNextExpenseNumber(schoolId);

    const created = await expenseRepository.create({
      schoolId,
      expenseNumber,
      category,
      title,
      description: optionalText(payload.description),
      amount,
      expenseDate: payload.expenseDate ? new Date(payload.expenseDate) : new Date(),
      paymentMethod,
      paymentStatus,
      paidAmount: paymentStatus === 'PAID' ? amount : ensureNumber(payload.paidAmount || 0, 'Paid Amount', 0),
      vendorName: optionalText(payload.vendorName),
      reference: optionalText(payload.reference),
      attachmentUrl: optionalText(payload.attachmentUrl),
      notes: optionalText(payload.notes),
      approvalStatus,
      createdBy: createdBy || optionalText(payload.createdBy),
    });

    return created.toPublicJSON();
  }

  async updateExpense(schoolId, id, payload = {}) {
    const existing = await expenseRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Expense not found', 404);

    const updates = {};
    if (payload.category !== undefined) updates.category = requireText(payload.category, 'Category');
    if (payload.title !== undefined) updates.title = requireText(payload.title, 'Title');
    if (payload.description !== undefined) updates.description = optionalText(payload.description);
    if (payload.amount !== undefined) updates.amount = ensureNumber(payload.amount, 'Amount', 0.01);
    if (payload.expenseDate !== undefined) updates.expenseDate = new Date(payload.expenseDate);
    if (payload.paymentMethod !== undefined)
      updates.paymentMethod = ensureOption(payload.paymentMethod, EXPENSE_PAYMENT_METHODS, 'Payment Method');
    if (payload.paymentStatus !== undefined)
      updates.paymentStatus = ensureOption(payload.paymentStatus, EXPENSE_PAYMENT_STATUSES, 'Payment Status');
    if (payload.paidAmount !== undefined) updates.paidAmount = ensureNumber(payload.paidAmount, 'Paid Amount', 0);
    if (payload.vendorName !== undefined) updates.vendorName = optionalText(payload.vendorName);
    if (payload.reference !== undefined) updates.reference = optionalText(payload.reference);
    if (payload.attachmentUrl !== undefined) updates.attachmentUrl = optionalText(payload.attachmentUrl);
    if (payload.notes !== undefined) updates.notes = optionalText(payload.notes);

    const updated = await expenseRepository.update(schoolId, id, updates);
    return updated.toPublicJSON();
  }

  async updateStatus(schoolId, id, payload = {}, approvedBy = '') {
    const existing = await expenseRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Expense not found', 404);

    const updates = {};
    if (payload.approvalStatus !== undefined) {
      updates.approvalStatus = ensureOption(payload.approvalStatus, EXPENSE_APPROVAL_STATUSES, 'Approval Status');
      updates.approvedBy = approvedBy || optionalText(payload.approvedBy);
    }
    if (payload.paymentStatus !== undefined) {
      updates.paymentStatus = ensureOption(payload.paymentStatus, EXPENSE_PAYMENT_STATUSES, 'Payment Status');
      if (updates.paymentStatus === 'PAID') updates.paidAmount = existing.amount;
    }
    if (!Object.keys(updates).length) throw new AppError('No status change provided', 400);

    const updated = await expenseRepository.update(schoolId, id, updates);
    return updated.toPublicJSON();
  }

  async deleteExpense(schoolId, id) {
    const removed = await expenseRepository.remove(schoolId, id);
    if (!removed) throw new AppError('Expense not found', 404);
    return { message: 'Expense deleted' };
  }

  async listCategories(schoolId) {
    const custom = await expenseRepository.distinctCategories(schoolId);
    const defaults = [
      'Salaries & Wages',
      'Utilities',
      'Maintenance & Repairs',
      'Stationery & Supplies',
      'Transport & Fuel',
      'Events & Activities',
      'Marketing',
      'Rent & Lease',
      'Miscellaneous',
    ];
    return [...new Set([...defaults, ...custom.filter(Boolean)])].sort();
  }
}

export const expenseService = new ExpenseService();
