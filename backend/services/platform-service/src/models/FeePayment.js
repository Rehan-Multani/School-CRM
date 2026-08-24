import mongoose from 'mongoose';

export const FEE_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'CHEQUE', 'DD', 'OTHER'];
export const FEE_PAYMENT_STATUSES = ['COMPLETED', 'REFUNDED', 'CANCELLED'];

const feePaymentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeInvoice', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    receiptNumber: { type: String, required: true, trim: true, uppercase: true },

    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: FEE_PAYMENT_METHODS,
      default: 'UPI',
    },
    paymentReference: { type: String, default: '', trim: true },
    paymentDate: { type: Date, default: Date.now },
    remarks: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: FEE_PAYMENT_STATUSES,
      default: 'COMPLETED',
    },
    collectedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

feePaymentSchema.index({ schoolId: 1, receiptNumber: 1 }, { unique: true });
feePaymentSchema.index({ schoolId: 1, invoiceId: 1 });
feePaymentSchema.index({ schoolId: 1, studentId: 1 });
feePaymentSchema.index({ schoolId: 1, paymentDate: -1 });

feePaymentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    invoiceId: this.invoiceId.toString(),
    studentId: this.studentId.toString(),
    receiptNumber: this.receiptNumber,
    amount: this.amount,
    paymentMethod: this.paymentMethod,
    paymentReference: this.paymentReference,
    paymentDate: this.paymentDate,
    remarks: this.remarks,
    status: this.status,
    collectedBy: this.collectedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeePayment = mongoose.model('FeePayment', feePaymentSchema);
