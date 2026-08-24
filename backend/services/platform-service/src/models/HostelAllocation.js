import mongoose from 'mongoose';

const hostelAllocationSchema = new mongoose.Schema(
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
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelRoom',
      required: true,
      index: true,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelBed',
      required: true,
      index: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null,
    },
    allocationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedCheckoutDate: {
      type: Date,
      default: null,
    },
    actualCheckoutDate: {
      type: Date,
      default: null,
    },
    securityDeposit: {
      type: Number,
      default: 0,
      min: 0,
    },
    depositRefunded: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'VACATED', 'TRANSFERRED'],
      default: 'ACTIVE',
      index: true,
    },
    checkoutReason: {
      type: String,
      default: '',
      trim: true,
    },
    checkoutRemarks: {
      type: String,
      default: '',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    allocatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
  },
  { timestamps: true }
);

hostelAllocationSchema.index({ schoolId: 1, studentId: 1, status: 1 });
hostelAllocationSchema.index({ schoolId: 1, bedId: 1, status: 1 });

export const HostelAllocation = mongoose.model('HostelAllocation', hostelAllocationSchema);
