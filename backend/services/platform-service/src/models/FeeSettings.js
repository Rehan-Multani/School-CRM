import mongoose from 'mongoose';

export const LATE_FEE_TYPES = ['NONE', 'FLAT', 'PER_DAY'];

/**
 * Per-school fee policy (one document per school).
 *   lateFee.type     NONE   → invoices only flip to OVERDUE, no charge
 *                    FLAT   → one fixed charge once the grace period passes
 *                    PER_DAY→ amount × overdue days, capped at maxAmount (0 = no cap)
 *   lateFee.graceDays  days after dueDate before an invoice counts as overdue
 */
const feeSettingsSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true },
    lateFee: {
      type: { type: String, enum: LATE_FEE_TYPES, default: 'NONE' },
      amount: { type: Number, default: 0, min: 0 },
      graceDays: { type: Number, default: 0, min: 0, max: 90 },
      maxAmount: { type: Number, default: 0, min: 0 },
    },
    // Day of month used for schedule due dates when a structure item has none.
    defaultDueDay: { type: Number, default: 10, min: 1, max: 28 },
  },
  { timestamps: true }
);

feeSettingsSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    lateFee: {
      type: this.lateFee?.type || 'NONE',
      amount: this.lateFee?.amount || 0,
      graceDays: this.lateFee?.graceDays || 0,
      maxAmount: this.lateFee?.maxAmount || 0,
    },
    defaultDueDay: this.defaultDueDay || 10,
    updatedAt: this.updatedAt,
  };
};

export const FeeSettings = mongoose.model('FeeSettings', feeSettingsSchema);
