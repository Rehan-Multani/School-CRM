import mongoose from 'mongoose';
import { feeRepository } from '../repositories/fee.repository.js';
import { expenseRepository } from '../repositories/expense.repository.js';
import { Expense } from '../models/Expense.js';
import { FinanceTransaction } from '../models/FinanceTransaction.js';

/**
 * Links money that moves OUTSIDE the fee module into the accountant's ledger:
 *   payroll PAID  → Expense row (category "Salary") + FinanceTransaction EXPENSE
 *   library fine PAID → FinanceTransaction INCOME (category "Library Fines")
 *
 * Idempotent: each source document is linked at most once (looked up by the
 * reference it stamps). Best-effort for the caller — a ledger failure must
 * never undo a salary disbursement or a book return — so callers wrap these
 * in try/catch and log.
 */

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

async function category(schoolId, name, type) {
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

const PAYROLL_METHOD_TO_EXPENSE = { BANK_TRANSFER: 'NET_BANKING', CHEQUE: 'CHEQUE', CASH: 'CASH', UPI: 'UPI' };

export const ledgerLinkageService = {
  payrollReference: (payrollId) => `PAYROLL:${String(payrollId)}`,
  libraryFineReference: (issueId) => `LIBFINE:${String(issueId)}`,

  /** Payroll record marked PAID → one Expense + one EXPENSE ledger row. */
  async recordPayrollExpense(schoolIdRaw, payroll) {
    if (!payroll || payroll.paymentStatus !== 'PAID') return null;
    const schoolId = String(schoolIdRaw);
    const reference = this.payrollReference(payroll._id);
    const amount = r2(payroll.netSalary);
    if (!(amount > 0)) return null;

    const existing = await Expense.findOne({ schoolId: oid(schoolId), reference }).lean();
    if (existing) return { expenseId: String(existing._id), alreadyLinked: true };

    const expenseDate = payroll.paymentDate ? new Date(payroll.paymentDate) : new Date();
    const paymentMethod = PAYROLL_METHOD_TO_EXPENSE[payroll.paymentMethod] || 'OTHER';
    const title = `Salary — ${payroll.employeeName} (${payroll.payrollMonth})`;

    const expenseNumber = await expenseRepository.getNextExpenseNumber(schoolId);
    const expense = await expenseRepository.create({
      schoolId: oid(schoolId),
      expenseNumber,
      category: 'Salary',
      title,
      description: `Payroll ${payroll.payrollMonth} · ${payroll.employeeRole || payroll.designation || ''}`.trim(),
      amount,
      expenseDate,
      paymentMethod,
      paymentStatus: 'PAID',
      paidAmount: amount,
      vendorName: payroll.employeeName,
      reference,
      notes: payroll.transactionRef ? `Txn ref: ${payroll.transactionRef}` : '',
      approvalStatus: 'APPROVED',
      createdBy: 'HR Payroll',
    });

    const cat = await category(schoolId, 'Salaries', 'EXPENSE');
    await feeRepository.createFinanceTransaction({
      schoolId: oid(schoolId),
      transactionDate: expenseDate,
      transactionType: 'EXPENSE',
      categoryId: cat._id,
      amount,
      paymentMode: paymentMethod,
      referenceNo: expenseNumber,
      description: title,
    });

    return { expenseId: String(expense._id), expenseNumber, alreadyLinked: false };
  },

  /** Library fine PAID → one INCOME ledger row. */
  async recordLibraryFineIncome(schoolIdRaw, issue, { paymentMode = 'CASH', collectedBy = 'Librarian' } = {}) {
    if (!issue || issue.fineStatus !== 'PAID') return null;
    const schoolId = String(schoolIdRaw);
    const amount = r2(issue.fineAmount);
    if (!(amount > 0)) return null;
    const referenceNo = this.libraryFineReference(issue._id);

    const existing = await FinanceTransaction.findOne({ schoolId: oid(schoolId), referenceNo }).lean();
    if (existing) return { transactionId: String(existing._id), alreadyLinked: true };

    const cat = await category(schoolId, 'Library Fines', 'INCOME');
    const title = issue.bookId?.title || '';
    const txn = await feeRepository.createFinanceTransaction({
      schoolId: oid(schoolId),
      transactionDate: issue.returnDate ? new Date(issue.returnDate) : new Date(),
      transactionType: 'INCOME',
      categoryId: cat._id,
      amount,
      paymentMode,
      referenceNo,
      description: `Library fine — ${issue.borrowerName || issue.borrowerCode || 'member'}${title ? ` · ${title}` : ''} (${collectedBy})`,
    });
    return { transactionId: String(txn._id), alreadyLinked: false };
  },
};
