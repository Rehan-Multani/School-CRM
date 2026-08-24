import mongoose from 'mongoose';

const PLAN_TYPES = ['Weekly', 'Monthly', 'Yearly'];

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    price: { type: Number, required: true, min: 0 },
    planType: { type: String, required: true, enum: PLAN_TYPES, default: 'Monthly' },
    features: [{ type: String, trim: true }],
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

subscriptionPlanSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    price: this.price,
    planType: this.planType,
    features: this.features || [],
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
export { PLAN_TYPES };
