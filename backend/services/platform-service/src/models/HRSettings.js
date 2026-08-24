import mongoose from 'mongoose';

const hrSettingsSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      unique: true,
      index: true,
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    },
    shiftStartTime: {
      type: String,
      default: '08:00 AM',
      trim: true,
    },
    shiftEndTime: {
      type: String,
      default: '03:00 PM',
      trim: true,
    },
    casualLeaveQuota: {
      type: Number,
      default: 12,
      min: 0,
    },
    medicalLeaveQuota: {
      type: Number,
      default: 6,
      min: 0,
    },
    paidLeaveQuota: {
      type: Number,
      default: 10,
      min: 0,
    },
    lateFineAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    absentDeductionPerDay: {
      type: Number,
      default: 0,
      min: 0,
    },
    probationPeriodMonths: {
      type: Number,
      default: 6,
      min: 0,
    },
    allowHalfDayLeaves: {
      type: Boolean,
      default: true,
    },
    autoApproveLeaves: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

hrSettingsSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    workingDays: this.workingDays || [],
    shiftStartTime: this.shiftStartTime || '08:00 AM',
    shiftEndTime: this.shiftEndTime || '03:00 PM',
    casualLeaveQuota: this.casualLeaveQuota ?? 12,
    medicalLeaveQuota: this.medicalLeaveQuota ?? 6,
    paidLeaveQuota: this.paidLeaveQuota ?? 10,
    lateFineAmount: this.lateFineAmount ?? 0,
    absentDeductionPerDay: this.absentDeductionPerDay ?? 0,
    probationPeriodMonths: this.probationPeriodMonths ?? 6,
    allowHalfDayLeaves: Boolean(this.allowHalfDayLeaves),
    autoApproveLeaves: Boolean(this.autoApproveLeaves),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const HRSettings = mongoose.model('HRSettings', hrSettingsSchema);
