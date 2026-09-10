import mongoose from 'mongoose';

export const FINANCE_TRANSACTION_TYPES = ['INCOME', 'EXPENSE'];

/**
 * Finance Transaction — unified income and expense records.
 *
 * - Income: automatically created when a fee payment succeeds
 * - Expense: manually created by authorized users
 *
 * Linked to original source:
 * - Income: linked to FeePayment via referenceNo
 * - Expense: standalone
 */
const financeTransactionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    transactionDate: {
      type: Date,
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: FINANCE_TRANSACTION_TYPES,
      required: true,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceCategory',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMode: {
      type: String,
      trim: true,
      default: '',
    },
    referenceNo: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    // Links to originating transaction
    feePaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeePayment',
      default: null,
    },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Receipt',
      default: null,
    },
    // For expenses
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
  },
  { timestamps: true }
);

financeTransactionSchema.index({ schoolId: 1, transactionDate: 1 });
financeTransactionSchema.index({ schoolId: 1, transactionType: 1 });
financeTransactionSchema.index({ schoolId: 1, categoryId: 1 });

financeTransactionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    transactionDate: this.transactionDate,
    transactionType: this.transactionType,
    categoryId: this.categoryId.toString(),
    amount: this.amount,
    paymentMode: this.paymentMode,
    referenceNo: this.referenceNo,
    description: this.description,
    feePaymentId: this.feePaymentId ? this.feePaymentId.toString() : null,
    receiptId: this.receiptId ? this.receiptId.toString() : null,
    approvedBy: this.approvedBy ? this.approvedBy.toString() : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FinanceTransaction = mongoose.model('FinanceTransaction', financeTransactionSchema);
