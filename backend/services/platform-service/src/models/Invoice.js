import mongoose from 'mongoose';

export const INVOICE_STATUSES = ['Pending', 'Paid', 'Overdue', 'Failed', 'Refunded', 'Cancelled'];
export const PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'Card', 'Cash', 'Cheque', 'Online'];
export const PLAN_TYPES = ['Weekly', 'Monthly', 'Yearly'];

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true, uppercase: true, unique: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    schoolName: { type: String, required: true, trim: true },
    schoolCode: { type: String, default: '', trim: true, uppercase: true },
    planName: { type: String, required: true, trim: true },
    planType: { type: String, enum: PLAN_TYPES, default: 'Monthly' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', trim: true, uppercase: true },
    status: { type: String, required: true, enum: INVOICE_STATUSES, default: 'Pending' },
    issuedAt: { type: Date, required: true },
    dueAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    refundedAt: { type: Date, default: null },
    paymentMethod: { type: String, default: '', trim: true },
    paymentReference: { type: String, default: '', trim: true },
    razorpayOrderId: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

invoiceSchema.index({ schoolName: 1 });
invoiceSchema.index({ status: 1, issuedAt: -1 });
invoiceSchema.index({ school: 1, issuedAt: -1 });

invoiceSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    invoiceNumber: this.invoiceNumber,
    schoolId: this.school?.toString?.() || this.school,
    schoolName: this.schoolName,
    schoolCode: this.schoolCode,
    planName: this.planName,
    planType: this.planType,
    amount: this.amount,
    currency: this.currency || 'INR',
    status: this.status,
    issuedAt: this.issuedAt,
    dueAt: this.dueAt,
    paidAt: this.paidAt,
    refundedAt: this.refundedAt,
    paymentMethod: this.paymentMethod || '',
    paymentReference: this.paymentReference || '',
    razorpayOrderId: this.razorpayOrderId || '',
    notes: this.notes || '',
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Invoice = mongoose.model('Invoice', invoiceSchema);
