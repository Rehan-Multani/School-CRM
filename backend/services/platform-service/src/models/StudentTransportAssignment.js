import mongoose from 'mongoose';

const studentTransportAssignmentSchema = new mongoose.Schema(
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
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportRoute',
      required: true,
      index: true,
    },
    pickupStopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RouteStop',
      required: true,
    },
    dropStopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RouteStop',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    monthlyFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'DISCONTINUED'],
      default: 'ACTIVE',
      index: true,
    },
    discontinueReason: {
      type: String,
      default: '',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
  },
  { timestamps: true }
);

studentTransportAssignmentSchema.index({ schoolId: 1, studentId: 1, status: 1 });
studentTransportAssignmentSchema.index({ schoolId: 1, routeId: 1, status: 1 });

export const StudentTransportAssignment = mongoose.model(
  'StudentTransportAssignment',
  studentTransportAssignmentSchema
);
