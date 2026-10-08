import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { feeRepository } from '../repositories/fee.repository.js';
import { StudentFeeAssignment } from '../models/StudentFeeAssignment.js';
import { feeLedgerService } from './feeLedger.service.js';

const PAYMENT_ERR = {
  VALIDATION_ERROR: 'PAYMENT_VALIDATION_ERROR',
  NOT_FOUND: 'PAYMENT_NOT_FOUND',
  INVALID_AMOUNT: 'PAYMENT_INVALID_AMOUNT',
  FEE_ASSIGNMENT_NOT_FOUND: 'FEE_ASSIGNMENT_NOT_FOUND',
  DUPLICATE_REFERENCE: 'PAYMENT_DUPLICATE_REFERENCE',
  CALCULATION_ERROR: 'PAYMENT_CALCULATION_ERROR',
};

function bad(message, code = PAYMENT_ERR.VALIDATION_ERROR) {
  return new AppError(message, 400, code);
}

function notFound(what) {
  return new AppError(`${what} not found`, 404, PAYMENT_ERR.NOT_FOUND);
}

/**
 * Fee Payment Service
 *
 * On successful payment creation:
 * 1. Validates the payment against student fee assignment
 * 2. Creates a Receipt record
 * 3. Creates a Finance Income transaction
 * 4. Updates StudentFeeAssignment paidAmount and status
 */
export const feePaymentService = {
  async collectPayment(schoolIdRaw, data = {}) {
    const schoolId = String(schoolIdRaw);
    if (!schoolId || !mongoose.isValidObjectId(String(schoolId))) {
      throw new AppError('School context is missing', 401, PAYMENT_ERR.VALIDATION_ERROR);
    }

    // Validate inputs
    const assignmentId = String(data.studentFeeAssignmentId || '').trim();
    if (!assignmentId || !mongoose.isValidObjectId(assignmentId)) {
      throw bad('Student fee assignment ID is required and must be valid');
    }

    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw bad('Payment amount must be a positive number', PAYMENT_ERR.INVALID_AMOUNT);
    }

    const paymentMode = String(data.paymentMode || '').trim().toUpperCase();
    if (!['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'ONLINE', 'OTHER'].includes(paymentMode)) {
      throw bad('Invalid payment mode');
    }

    // Fetch the fee assignment
    const assignment = await StudentFeeAssignment.findOne({ _id: assignmentId, schoolId })
      .populate('studentId', 'firstName lastName')
      .populate('academicYearId', 'name')
      .populate('classId', 'name');

    if (!assignment) {
      throw notFound('Student fee assignment');
    }

    const payableAmount = assignment.getPayableAmount();
    const currentDue = assignment.getDueAmount();

    // Validate payment amount
    if (amount > currentDue) {
      throw bad(
        `Payment amount (₹${amount}) exceeds current due (₹${currentDue})`,
        PAYMENT_ERR.INVALID_AMOUNT
      );
    }

    // Single ledger path: FeePayment + Receipt + FinanceTransaction, status
    // COMPLETED (the accountant's reports only count COMPLETED), with
    // compensation if any step fails.
    const { payment, receipt, financeTransaction } = await feeLedgerService.recordPayment({
      schoolId,
      assignment,
      amount,
      paymentMethod: paymentMode,
      paymentDate: data.transactionDate || new Date(),
      reference: data.referenceNo || '',
      remarks: data.notes || '',
      collectedBy: data.collectedBy || 'Accounts Office',
    });

    return {
      payment: payment.toPublicJSON(),
      receipt: receipt.toPublicJSON(),
      financeTransaction: financeTransaction.toPublicJSON(),
      updatedAssignment: assignment.toPublicJSON(),
    };
  },

  async listPayments(schoolIdRaw, filter = {}) {
    const schoolId = String(schoolIdRaw);
    const payments = await feeRepository.listFeePayments(schoolId, filter);
    return payments.map((p) => p.toPublicJSON());
  },

  async getPayment(schoolIdRaw, paymentId) {
    const schoolId = String(schoolIdRaw);
    const payment = await feeRepository.getFeePayment(schoolId, paymentId);
    if (!payment) throw notFound('Payment');
    return payment.toPublicJSON();
  },
};
