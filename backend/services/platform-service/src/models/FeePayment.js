import mongoose from 'mongoose';

export const FEE_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'CHEQUE', 'DD', 'ONLINE', 'BANK_TRANSFER', 'OTHER'];
export const FEE_PAYMENT_STATUSES = ['COMPLETED', 'SUCCESS', 'REFUNDED', 'CANCELLED', 'PENDING', 'FAILED'];

const feePaymentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeInvoice',
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      index: true,
    },
    studentFeeAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFeeAssignment',
      index: true,
    },
    receiptNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: 'UPI',
    },
    paymentMode: {
      type: String,
      default: 'UPI',
    },
    paymentReference: {
      type: String,
      default: '',
      trim: true,
    },
    referenceNo: {
      type: String,
      default: '',
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      default: 'COMPLETED',
      index: true,
    },
    collectedBy: {
      type: String,
      default: '',
      trim: true,
    },
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

feePaymentSchema.index({ schoolId: 1, receiptNumber: 1 });
feePaymentSchema.index({ schoolId: 1, invoiceId: 1 });
feePaymentSchema.index({ schoolId: 1, studentId: 1 });
feePaymentSchema.index({ schoolId: 1, paymentDate: -1 });

feePaymentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId?.toString(),
    invoiceId: this.invoiceId?._id?.toString ? this.invoiceId._id.toString() : this.invoiceId?.toString(),
    studentId: this.studentId?._id
      ? {
          id: this.studentId._id.toString(),
          firstName: this.studentId.firstName,
          lastName: this.studentId.lastName,
          admissionNumber: this.studentId.admissionNumber,
        }
      : this.studentId?.toString(),
    studentFeeAssignmentId: this.studentFeeAssignmentId?._id?.toString ? this.studentFeeAssignmentId._id.toString() : this.studentFeeAssignmentId?.toString(),
    receiptNumber: this.receiptNumber,
    amount: this.amount,
    paymentMethod: this.paymentMethod || this.paymentMode || 'UPI',
    paymentMode: this.paymentMode || this.paymentMethod || 'UPI',
    paymentReference: this.paymentReference || this.referenceNo || '',
    referenceNo: this.referenceNo || this.paymentReference || '',
    paymentDate: this.paymentDate || this.transactionDate,
    transactionDate: this.transactionDate || this.paymentDate,
    remarks: this.remarks || this.notes || '',
    notes: this.notes || this.remarks || '',
    status: this.status,
    collectedBy: this.collectedBy,
    receiptId: this.receiptId?.toString() || null,
    financeTransactionId: this.financeTransactionId?.toString() || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeePayment = mongoose.model('FeePayment', feePaymentSchema);
