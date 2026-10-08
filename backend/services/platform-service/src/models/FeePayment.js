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
    // ---- Online payment (Parent app "Pay Now"); MANUAL = recorded by the accountant.
    // parentFeePayment.service writes these from the Razorpay webhook, and
    // gatewayPaymentId is how a re-delivered webhook is recognised: without
    // these fields Mongoose drops the values and every replay credits the
    // invoice again.
    gateway: { type: String, enum: ['MANUAL', 'RAZORPAY'], default: 'MANUAL' },
    gatewayOrderId: { type: String, default: '', trim: true },
    gatewayPaymentId: { type: String, default: '', trim: true },
    gatewaySignature: { type: String, default: '', trim: true, select: false },
    paidByParentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', default: null },
    // Portion of a gateway payment that exceeded the invoice balance at capture
    // time (e.g. cash was collected while the parent was paying online). The
    // money was really received, so it is recorded here for a refund.
    overpaidAmount: { type: Number, default: 0, min: 0 },
    // Portion of `amount` currently applied to the invoice (amount − overpaid − refunded-from-applied).
    appliedAmount: { type: Number, default: null },
    // Refund / cancellation audit.
    refundedAmount: { type: Number, default: 0, min: 0 },
    refunds: [
      {
        amount: { type: Number, required: true, min: 0 },
        kind: { type: String, enum: ['REFUND', 'CANCEL'], default: 'REFUND' },
        reason: { type: String, default: '', trim: true },
        method: { type: String, default: '', trim: true },
        reference: { type: String, default: '', trim: true },
        refundedAt: { type: Date, default: Date.now },
        by: { type: String, default: '', trim: true },
        financeTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceTransaction', default: null },
      },
    ],
  },
  { timestamps: true }
);

// One receipt number per school. Partial so legacy rows without a number
// (and the random RCPT-* numbers of early online payments) are not affected.
feePaymentSchema.index(
  { schoolId: 1, receiptNumber: 1 },
  { unique: true, partialFilterExpression: { receiptNumber: { $type: 'string', $gt: '' } } }
);
feePaymentSchema.index({ schoolId: 1, invoiceId: 1 });
feePaymentSchema.index({ schoolId: 1, studentId: 1 });
feePaymentSchema.index({ schoolId: 1, paymentDate: -1 });
// Webhook idempotency: at most ONE FeePayment per captured gateway payment,
// even if two deliveries race. Manual payments ('' id) are not constrained.
feePaymentSchema.index(
  { gatewayPaymentId: 1 },
  { unique: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string', $gt: '' } } }
);

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
    receiptId: this.receiptId?._id ? this.receiptId._id.toString() : this.receiptId?.toString() || null,
    receipt: this.receiptId?._id && typeof this.receiptId.toPublicJSON === 'function' ? this.receiptId.toPublicJSON() : undefined,
    financeTransactionId: this.financeTransactionId?._id ? this.financeTransactionId._id.toString() : this.financeTransactionId?.toString() || null,
    overpaidAmount: this.overpaidAmount || 0,
    appliedAmount: this.appliedAmount ?? Math.max(0, (this.amount || 0) - (this.overpaidAmount || 0)),
    refundedAmount: this.refundedAmount || 0,
    refunds: (this.refunds || []).map((r) => ({
      amount: r.amount,
      kind: r.kind,
      reason: r.reason,
      method: r.method,
      reference: r.reference,
      refundedAt: r.refundedAt,
      by: r.by,
    })),
    gateway: this.gateway || 'MANUAL',
    gatewayOrderId: this.gatewayOrderId || '',
    gatewayPaymentId: this.gatewayPaymentId || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeePayment = mongoose.model('FeePayment', feePaymentSchema);
