import mongoose from 'mongoose';

const PLAN_TYPES = ['Weekly', 'Monthly', 'Yearly'];

// Recurring (Razorpay-linked) fields, additive — existing plans created before
// this feature simply have billingInterval='' and are not Razorpay-recurring.
export const BILLING_INTERVALS = ['monthly', 'yearly'];
export const PLAN_STATUSES = ['active', 'inactive', 'archived'];

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, default: '', trim: true, uppercase: true },
    description: { type: String, default: '', trim: true },

    price: { type: Number, required: true, min: [0.01, 'Price must be greater than 0'] },
    planType: { type: String, required: true, enum: PLAN_TYPES, default: 'Monthly' },
    features: [{ type: String, trim: true }],

    // --- Razorpay recurring plan linkage (optional / additive) ---
    razorpayPlanId: { type: String, default: '', trim: true },
    billingInterval: { type: String, enum: ['', ...BILLING_INTERVALS], default: '' },
    billingIntervalCount: { type: Number, default: 1, min: 1 },
    trialDays: { type: Number, default: 0, min: 0 },
    limits: {
      students: { type: Number, default: null },
      teachers: { type: Number, default: null },
      staff: { type: Number, default: null },
    },
    status: { type: String, enum: PLAN_STATUSES, default: 'active', index: true },
    updatedBy: { type: String, default: '' },

    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

// NOTE: these fields default to '' (not undefined), so a plain `sparse` index
// does NOT exclude them from the uniqueness check — Mongo's `sparse` only
// skips documents where the field is truly absent, and every plan has this
// field present (as ''). A partial filter excluding empty strings is what
// actually allows multiple non-recurring / non-coded plans to coexist.
subscriptionPlanSchema.index(
  { razorpayPlanId: 1 },
  { unique: true, partialFilterExpression: { razorpayPlanId: { $type: 'string', $gt: '' } } }
);
subscriptionPlanSchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { code: { $type: 'string', $gt: '' } } }
);

subscriptionPlanSchema.methods.isRecurring = function isRecurring() {
  return Boolean(this.razorpayPlanId);
};

subscriptionPlanSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    code: this.code || '',
    description: this.description || '',
    price: this.price,
    planType: this.planType,
    features: this.features || [],
    razorpayPlanId: this.razorpayPlanId || '',
    billingInterval: this.billingInterval || '',
    billingIntervalCount: this.billingIntervalCount || 1,
    trialDays: this.trialDays || 0,
    limits: {
      students: this.limits?.students ?? null,
      teachers: this.limits?.teachers ?? null,
      staff: this.limits?.staff ?? null,
    },
    status: this.status || 'active',
    isRecurring: this.isRecurring(),
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export { PLAN_TYPES };
