import mongoose from 'mongoose';

const staffAttendanceSchema = new mongoose.Schema(
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
    employeeRole: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    date: {
      type: String, // Stored as ISO date string 'YYYY-MM-DD'
      required: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY'],
      default: 'PRESENT',
      index: true,
    },
    leaveType: {
      type: String,
      enum: ['CASUAL', 'MEDICAL', 'PAID', 'UNPAID', 'OTHER', ''],
      default: '',
    },
    leaveReason: {
      type: String,
      default: '',
      trim: true,
    },
    clockIn: {
      type: String,
      default: '08:00 AM',
      trim: true,
    },
    clockOut: {
      type: String,
      default: '03:00 PM',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    recordedBy: {
      type: String,
      default: 'Admin',
      trim: true,
    },
  },
  { timestamps: true }
);

staffAttendanceSchema.index({ schoolId: 1, date: 1, employeeRefId: 1 }, { unique: true });
staffAttendanceSchema.index({ schoolId: 1, date: 1, status: 1 });

staffAttendanceSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    employeeRefId: this.employeeRefId.toString(),
    employeeType: this.employeeType,
    employeeId: this.employeeId,
    employeeName: this.employeeName,
    employeeRole: this.employeeRole,
    department: this.department,
    date: this.date,
    status: this.status,
    leaveType: this.leaveType,
    leaveReason: this.leaveReason,
    clockIn: this.clockIn,
    clockOut: this.clockOut,
    remarks: this.remarks,
    recordedBy: this.recordedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StaffAttendance = mongoose.model('StaffAttendance', staffAttendanceSchema);
