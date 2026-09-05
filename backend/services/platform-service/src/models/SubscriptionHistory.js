import mongoose from 'mongoose';

export const SUBSCRIPTION_HISTORY_ACTIONS = [
  'created',
  'activated',
  'renewed',
  'upgraded',
  'downgraded',
  'downgrade_scheduled',
  'cancel_requested',
  'cancelled',
  'payment_failed',
  'payment_recovered',
  'expired',
  'paused',
  'resumed',
  'reconciled',
  'admin_override',
];

const subscriptionHistorySchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolSubscription', required: true, index: true },

    action: { type: String, enum: SUBSCRIPTION_HISTORY_ACTIONS, required: true },

    fromPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
    toPlan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },

    fromStatus: { type: String, default: '', trim: true },
    toStatus: { type: String, default: '', trim: true },

    reason: { type: String, default: '', trim: true },
    performedBy: { type: String, default: 'System', trim: true },
    source: { type: String, enum: ['super_admin', 'school_admin', 'webhook', 'cron', 'system'], default: 'system' },

    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

subscriptionHistorySchema.index({ subscriptionId: 1, createdAt: -1 });
subscriptionHistorySchema.index({ schoolId: 1, createdAt: -1 });

subscriptionHistorySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    subscriptionId: this.subscriptionId.toString(),
    action: this.action,
    fromPlan: this.fromPlan?.toString?.() || null,
    toPlan: this.toPlan?.toString?.() || null,
    fromStatus: this.fromStatus || '',
    toStatus: this.toStatus || '',
    reason: this.reason || '',
    performedBy: this.performedBy,
    source: this.source,
    createdAt: this.createdAt,
  };
};

export const SubscriptionHistory = mongoose.model('SubscriptionHistory', subscriptionHistorySchema);
