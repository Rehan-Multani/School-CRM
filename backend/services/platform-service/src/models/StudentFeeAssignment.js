import mongoose from 'mongoose';

export const DISCOUNT_TYPES = ['NONE', 'PERCENTAGE', 'FIXED'];
export const ASSIGNMENT_STATUSES = ['ACTIVE', 'WAIVED', 'CANCELLED', 'PENDING', 'PARTIAL', 'PAID'];

const studentFeeAssignmentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    enrollmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentEnrollment',
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolClass',
    },
    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: true,
    },
    feeStructureItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeStructureItem',
    },
    feeHeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeHead',
    },

    // Snapshot values
    feeHeadName: { type: String, trim: true },
    originalAmount: { type: Number, min: 0 },
    frequency: { type: String },

    // Student-specific adjustments
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      default: 'NONE',
    },
    discountValue: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    concessionAmount: { type: Number, default: 0, min: 0 },
    finalAmount: { type: Number, default: 0, min: 0 },

    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    isOptedIn: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
    remarks: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

studentFeeAssignmentSchema.index({ schoolId: 1, studentId: 1, feeStructureItemId: 1 });
studentFeeAssignmentSchema.index({ schoolId: 1, enrollmentId: 1 });

studentFeeAssignmentSchema.methods.getPayableAmount = function getPayableAmount() {
  if (this.finalAmount !== undefined && this.finalAmount > 0) {
    return this.finalAmount;
  }
  return Math.max(0, (this.totalAmount || 0) - (this.discountAmount || 0));
};

studentFeeAssignmentSchema.methods.getDueAmount = function getDueAmount() {
  return Math.max(0, this.getPayableAmount() - (this.paidAmount || 0));
};

studentFeeAssignmentSchema.methods.updateStatus = function updateStatus() {
  const due = this.getDueAmount();
  const payable = this.getPayableAmount();
  if (due === 0) {
    this.status = 'PAID';
  } else if (this.paidAmount > 0 && this.paidAmount < payable) {
    this.status = 'PARTIAL';
  } else {
    this.status = 'PENDING';
  }
};

studentFeeAssignmentSchema.methods.toPublicJSON = function toPublicJSON() {
  const payable = this.getPayableAmount();
  const due = this.getDueAmount();
  return {
    id: this._id.toString(),
    schoolId: this.schoolId?.toString(),
    studentId: this.studentId?._id?.toString ? this.studentId._id.toString() : this.studentId?.toString(),
    enrollmentId: this.enrollmentId?._id?.toString ? this.enrollmentId._id.toString() : this.enrollmentId?.toString(),
    academicYearId: this.academicYearId?._id?.toString ? this.academicYearId._id.toString() : this.academicYearId?.toString(),
    classId: this.classId?._id?.toString ? this.classId._id.toString() : this.classId?.toString(),
    feeStructureId: this.feeStructureId?._id?.toString ? this.feeStructureId._id.toString() : this.feeStructureId?.toString(),
    feeStructureItemId: this.feeStructureItemId?._id?.toString ? this.feeStructureItemId._id.toString() : this.feeStructureItemId?.toString(),
    feeHeadId: this.feeHeadId?._id?.toString ? this.feeHeadId._id.toString() : this.feeHeadId?.toString(),
    feeHeadName: this.feeHeadName,
    originalAmount: this.originalAmount,
    frequency: this.frequency,
    discountType: this.discountType,
    discountValue: this.discountValue,
    discountAmount: this.discountAmount,
    concessionAmount: this.concessionAmount,
    finalAmount: this.finalAmount,
    totalAmount: this.totalAmount || this.originalAmount || 0,
    discountAmount: this.discountAmount || 0,
    payableAmount: payable,
    paidAmount: this.paidAmount || 0,
    dueAmount: due,
    isOptedIn: this.isOptedIn,
    status: this.status,
    remarks: this.remarks,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StudentFeeAssignment = mongoose.model('StudentFeeAssignment', studentFeeAssignmentSchema);
