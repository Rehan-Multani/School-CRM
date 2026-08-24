import mongoose from 'mongoose';

const hostelOutingSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    outingType: {
      type: String,
      enum: ['DAY_OUTING', 'NIGHT_STAY', 'EMERGENCY', 'HOME_VISIT', 'MEDICAL'],
      default: 'DAY_OUTING',
      required: true,
    },
    outDateTime: {
      type: Date,
      required: true,
    },
    expectedReturnDateTime: {
      type: Date,
      required: true,
    },
    actualReturnDateTime: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      default: '',
      trim: true,
    },
    parentPermissionStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NOT_REQUIRED'],
      default: 'PENDING',
    },
    wardenApprovalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    gatePassCode: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'OUT', 'RETURNED', 'OVERDUE', 'REJECTED', 'CANCELLED'],
      default: 'REQUESTED',
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

hostelOutingSchema.index({ schoolId: 1, hostelId: 1, status: 1 });
hostelOutingSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });

export const HostelOuting = mongoose.model('HostelOuting', hostelOutingSchema);
