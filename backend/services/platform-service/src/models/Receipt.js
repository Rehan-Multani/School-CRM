import mongoose from 'mongoose';

/**
 * Receipt — generated automatically when a fee payment succeeds.
 *
 * Each receipt is unique within the school.
 */
const receiptSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    receiptNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    feePaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeePayment',
      required: true,
    },
    studentFeeAssignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentFeeAssignment',
      required: true,
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
    paidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMode: {
      type: String,
      trim: true,
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    // Remaining due after this payment
    remainingDue: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Receipt number is unique per school
receiptSchema.index({ schoolId: 1, receiptNumber: 1 }, { unique: true });
receiptSchema.index({ schoolId: 1, studentId: 1 });

receiptSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    receiptNumber: this.receiptNumber,
    feePaymentId: this.feePaymentId.toString(),
    studentFeeAssignmentId: this.studentFeeAssignmentId.toString(),
    studentId: this.studentId.toString(),
    academicYearId: this.academicYearId.toString(),
    classId: this.classId.toString(),
    paidAmount: this.paidAmount,
    paymentMode: this.paymentMode,
    referenceNumber: this.referenceNumber,
    remainingDue: this.remainingDue,
    paymentDate: this.paymentDate,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Receipt = mongoose.model('Receipt', receiptSchema);
