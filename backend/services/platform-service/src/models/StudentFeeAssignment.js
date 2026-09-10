import mongoose from 'mongoose';

export const FEE_ASSIGNMENT_STATUSES = ['PENDING', 'PARTIAL', 'PAID'];

/**
 * Student Fee Assignment — tracks the fee lifecycle for one student.
 *
 * Example:
 * - Student: Rahul
 * - Academic Year: 2026-27
 * - Class: 5
 * - Total Fee: ₹5,500
 * - Discount: ₹500
 * - Paid: ₹3,000
 * - Due: ₹2,000
 * - Status: PARTIAL
 *
 * Calculation (backend-authoritative):
 * - totalAmount: from fee structure
 * - discountAmount: sum of approved discounts
 * - payableAmount = totalAmount - discountAmount
 * - paidAmount: sum of successful payments
 * - dueAmount = payableAmount - paidAmount
 * - status: PENDING (due > 0) | PARTIAL (0 < due < payable) | PAID (due = 0)
 */
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
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolClass',
      required: true,
    },
    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: true,
    },
    // Backend-calculated from fee structure
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Sum of approved discounts for this student
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // payableAmount = totalAmount - discountAmount
    // (not stored, derived)
    // Sum of all successful payments
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // dueAmount = (totalAmount - discountAmount) - paidAmount
    // (not stored, derived)
    status: {
      type: String,
      enum: FEE_ASSIGNMENT_STATUSES,
      default: 'PENDING',
      index: true,
    },
  },
  { timestamps: true }
);

// One assignment per student per year (or per class)
studentFeeAssignmentSchema.index({ schoolId: 1, studentId: 1, academicYearId: 1 }, { unique: true });

studentFeeAssignmentSchema.methods.getPayableAmount = function getPayableAmount() {
  return this.totalAmount - this.discountAmount;
};

studentFeeAssignmentSchema.methods.getDueAmount = function getDueAmount() {
  return Math.max(0, this.getPayableAmount() - this.paidAmount);
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
    studentId: this.studentId.toString(),
    academicYearId: this.academicYearId.toString(),
    classId: this.classId.toString(),
    feeStructureId: this.feeStructureId.toString(),
    totalAmount: this.totalAmount,
    discountAmount: this.discountAmount,
    payableAmount: payable,
    paidAmount: this.paidAmount,
    dueAmount: due,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StudentFeeAssignment = mongoose.model('StudentFeeAssignment', studentFeeAssignmentSchema);
