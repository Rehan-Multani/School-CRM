import mongoose from 'mongoose';

export const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'ONLINE', 'OTHER'];
export const PAYMENT_STATUSES = ['SUCCESS', 'FAILED', 'PENDING'];

/**
 * Fee Payment — records a payment transaction for a student's fee.
 *
 * On successful creation:
 * - Automatically creates a Receipt
 * - Automatically creates a Finance Income transaction
 * - Updates StudentFeeAssignment paidAmount and status
 */
const feePaymentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    studentFeeAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFeeAssignment',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMode: {
      type: String,
      enum: PAYMENT_MODES,
      required: true,
    },
    referenceNo: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'SUCCESS',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // References to linked records
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Receipt',
      default: null,
    },
    financeTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceTransaction',
      default: null,
    },
  },
  { timestamps: true }
);

feePaymentSchema.index({ schoolId: 1, studentFeeAssignmentId: 1 });
feePaymentSchema.index({ schoolId: 1, status: 1 });

feePaymentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    studentFeeAssignmentId: this.studentFeeAssignmentId.toString(),
    amount: this.amount,
    paymentMode: this.paymentMode,
    referenceNo: this.referenceNo,
    transactionDate: this.transactionDate,
    status: this.status,
    notes: this.notes,
    receiptId: this.receiptId ? this.receiptId.toString() : null,
    financeTransactionId: this.financeTransactionId ? this.financeTransactionId.toString() : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeePayment = mongoose.model('FeePayment', feePaymentSchema);
