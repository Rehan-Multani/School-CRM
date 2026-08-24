import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    employeeRefId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeType: {
      type: String,
      enum: ['TEACHER', 'STAFF'],
      required: true,
      default: 'STAFF',
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    leaveType: {
      type: String,
      enum: ['CASUAL', 'MEDICAL', 'PAID', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER'],
      required: true,
      default: 'CASUAL',
    },
    startDate: {
      type: String, // ISO 'YYYY-MM-DD'
      required: true,
      trim: true,
    },
    endDate: {
      type: String, // ISO 'YYYY-MM-DD'
      required: true,
      trim: true,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    approvedBy: {
      type: String,
      default: '',
      trim: true,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectedBy: {
      type: String,
      default: '',
      trim: true,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    documentUrl: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ schoolId: 1, status: 1 });
leaveRequestSchema.index({ schoolId: 1, employeeRefId: 1, startDate: 1 });

leaveRequestSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    employeeRefId: this.employeeRefId.toString(),
    employeeType: this.employeeType,
    employeeId: this.employeeId,
    employeeName: this.employeeName,
    department: this.department,
    leaveType: this.leaveType,
    startDate: this.startDate,
    endDate: this.endDate,
    totalDays: this.totalDays,
    reason: this.reason,
    status: this.status,
    approvedBy: this.approvedBy,
    approvedAt: this.approvedAt,
    rejectedBy: this.rejectedBy,
    rejectedAt: this.rejectedAt,
    rejectionReason: this.rejectionReason,
    documentUrl: this.documentUrl,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
