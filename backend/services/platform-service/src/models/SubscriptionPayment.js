import mongoose from 'mongoose';

export const SUBSCRIPTION_PAYMENT_STATUSES = [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'partially_refunded',
];

const subscriptionPaymentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolSubscription', required: true, index: true },

    razorpayPaymentId: { type: String, required: true, trim: true },
    razorpaySubscriptionId: { type: String, default: '', trim: true },
    razorpayInvoiceId: { type: String, default: '', trim: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', trim: true, uppercase: true },

    status: { type: String, enum: SUBSCRIPTION_PAYMENT_STATUSES, default: 'created', index: true },
    method: { type: String, default: '', trim: true },
    captured: { type: Boolean, default: false },

    failureReason: { type: String, default: '', trim: true },
    failureCode: { type: String, default: '', trim: true },

    paidAt: { type: Date, default: null },

    webhookEventId: { type: String, default: '', trim: true },

    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({ razorpayPaymentId: 1 }, { unique: true });
subscriptionPaymentSchema.index({ schoolId: 1, createdAt: -1 });
subscriptionPaymentSchema.index({ subscriptionId: 1, createdAt: -1 });

subscriptionPaymentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    subscriptionId: this.subscriptionId.toString(),
    razorpayPaymentId: this.razorpayPaymentId,
    razorpayInvoiceId: this.razorpayInvoiceId || '',
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    method: this.method || '',
    captured: this.captured,
    failureReason: this.failureReason || '',
    failureCode: this.failureCode || '',
    paidAt: this.paidAt,
    createdAt: this.createdAt,
  };
};

export const SubscriptionPayment = mongoose.model('SubscriptionPayment', subscriptionPaymentSchema);
