import mongoose from 'mongoose';

// Razorpay subscription lifecycle states + two local-only states (EXPIRED for
// grace-period-exhausted, FAILED as a terminal local marker when Razorpay
// creation itself could not complete).
export const SCHOOL_SUBSCRIPTION_STATUSES = [
  'created',
  'authenticated',
  'active',
  'pending',
  'halted',
  'paused',
  'cancelled',
  'completed',
  'expired',
  'failed',
];

const schoolSubscriptionSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },

    razorpaySubscriptionId: { type: String, default: '', trim: true },
    razorpayCustomerId: { type: String, default: '', trim: true },

    status: { type: String, enum: SCHOOL_SUBSCRIPTION_STATUSES, default: 'created', index: true },

    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null, index: true },

    trialStart: { type: Date, default: null },
    trialEnd: { type: Date, default: null },

    quantity: { type: Number, default: 1, min: 1 },

    totalAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR', trim: true, uppercase: true },

    cancelAtPeriodEnd: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },

    nextBillingAt: { type: Date, default: null, index: true },

    lastPaymentAt: { type: Date, default: null },
    lastPaymentId: { type: String, default: '', trim: true },
    latestInvoiceId: { type: String, default: '', trim: true },

    failureCount: { type: Number, default: 0, min: 0 },
    lastFailureReason: { type: String, default: '', trim: true },
    lastFailureAt: { type: Date, default: null },
    lastFailureNotifiedAt: { type: Date, default: null }, // dedupes the failed-payment-recovery cron's reminders

    gracePeriodEndsAt: { type: Date, default: null },

    // Pending downgrade — applied at the next billing cycle rather than immediately.
    pendingPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
    pendingChangeType: { type: String, enum: ['', 'upgrade', 'downgrade'], default: '' },
    pendingChangeEffectiveAt: { type: Date, default: null },

    // Reconciliation bookkeeping — never used to silently downgrade based on stale reads.
    lastReconciledAt: { type: Date, default: null },
    reconciliationNote: { type: String, default: '', trim: true },

    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    createdBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

schoolSubscriptionSchema.index({ razorpaySubscriptionId: 1 }, { unique: true, sparse: true });
schoolSubscriptionSchema.index({ status: 1, nextBillingAt: 1 });
schoolSubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });
schoolSubscriptionSchema.index({ status: 1, gracePeriodEndsAt: 1 });
schoolSubscriptionSchema.index({ status: 1, createdAt: 1 }); // stale-subscription scan

export const ACTIVE_LIKE_STATUSES = ['created', 'authenticated', 'active', 'pending', 'halted'];

schoolSubscriptionSchema.methods.toPublicJSON = function toPublicJSON(extra = {}) {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    planId: this.planId?.toString?.() || this.planId,
    plan: extra.plan || undefined,
    razorpaySubscriptionId: this.razorpaySubscriptionId || '',
    status: this.status,
    currentPeriodStart: this.currentPeriodStart,
    currentPeriodEnd: this.currentPeriodEnd,
    trialStart: this.trialStart,
    trialEnd: this.trialEnd,
    quantity: this.quantity,
    totalAmount: this.totalAmount,
    currency: this.currency,
    cancelAtPeriodEnd: this.cancelAtPeriodEnd,
    cancelledAt: this.cancelledAt,
    endedAt: this.endedAt,
    nextBillingAt: this.nextBillingAt,
    lastPaymentAt: this.lastPaymentAt,
    failureCount: this.failureCount,
    lastFailureReason: this.lastFailureReason || '',
    gracePeriodEndsAt: this.gracePeriodEndsAt,
    pendingPlanId: this.pendingPlanId?.toString?.() || null,
    pendingChangeType: this.pendingChangeType || '',
    pendingChangeEffectiveAt: this.pendingChangeEffectiveAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SchoolSubscription = mongoose.model('SchoolSubscription', schoolSubscriptionSchema);
