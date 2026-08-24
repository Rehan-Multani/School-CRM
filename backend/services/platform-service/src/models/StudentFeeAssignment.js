import mongoose from 'mongoose';

export const DISCOUNT_TYPES = ['NONE', 'PERCENTAGE', 'FIXED'];
export const ASSIGNMENT_STATUSES = ['ACTIVE', 'WAIVED', 'CANCELLED'];

const studentFeeAssignmentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentEnrollment', required: true },
    feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
    feeStructureItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructureItem', required: true },
    feeHeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeHead', required: true },

    // Snapshot values (immutable)
    feeHeadName: { type: String, required: true, trim: true },
    originalAmount: { type: Number, required: true, min: 0 },
    frequency: { type: String, required: true },

    // Student-specific adjustments
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      default: 'NONE',
    },
    discountValue: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    concessionAmount: { type: Number, default: 0, min: 0 },
    finalAmount: { type: Number, required: true, min: 0 },

    isOptedIn: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: 'ACTIVE',
    },
    remarks: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

studentFeeAssignmentSchema.index({ schoolId: 1, studentId: 1, feeStructureItemId: 1 }, { unique: true });
studentFeeAssignmentSchema.index({ schoolId: 1, enrollmentId: 1 });

studentFeeAssignmentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    studentId: this.studentId.toString(),
    enrollmentId: this.enrollmentId.toString(),
    feeStructureId: this.feeStructureId.toString(),
    feeStructureItemId: this.feeStructureItemId.toString(),
    feeHeadId: this.feeHeadId.toString(),
    feeHeadName: this.feeHeadName,
    originalAmount: this.originalAmount,
    frequency: this.frequency,
    discountType: this.discountType,
    discountValue: this.discountValue,
    discountAmount: this.discountAmount,
    concessionAmount: this.concessionAmount,
    finalAmount: this.finalAmount,
    isOptedIn: this.isOptedIn,
    status: this.status,
    remarks: this.remarks,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StudentFeeAssignment = mongoose.model('StudentFeeAssignment', studentFeeAssignmentSchema);
