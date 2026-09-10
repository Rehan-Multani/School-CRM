import mongoose from 'mongoose';

export const DISCOUNT_TYPES = ['FIXED', 'PERCENTAGE'];
export const DISCOUNT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

/**
 * Discount — a concession applied to a student's fee.
 *
 * Example:
 * - Student Fee Assignment: ₹5,500
 * - Discount Type: FIXED
 * - Discount Value: ₹500
 * - Updated Fee: ₹5,000
 */
const discountSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    studentFeeAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFeeAssignment',
      required: true,
    },
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    // Calculated: actual amount to discount
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
    status: {
      type: String,
      enum: DISCOUNT_STATUSES,
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true }
);

discountSchema.index({ schoolId: 1, studentFeeAssignmentId: 1 });

discountSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    studentFeeAssignmentId: this.studentFeeAssignmentId.toString(),
    discountType: this.discountType,
    discountValue: this.discountValue,
    discountAmount: this.discountAmount,
    reason: this.reason,
    approvedBy: this.approvedBy ? this.approvedBy.toString() : null,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Discount = mongoose.model('Discount', discountSchema);
