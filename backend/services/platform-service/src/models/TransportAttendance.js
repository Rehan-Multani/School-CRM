import mongoose from 'mongoose';

const transportAttendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RouteStop',
      default: null,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'NOT_BOARDED', 'LEAVE'],
      default: 'PRESENT',
    },
    boardedTime: {
      type: String,
      default: '',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const transportAttendanceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportRoute',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    tripType: {
      type: String,
      enum: ['MORNING_PICKUP', 'EVENING_DROP'],
      default: 'MORNING_PICKUP',
      required: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
    totalStudents: {
      type: Number,
      default: 0,
    },
    presentCount: {
      type: Number,
      default: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
    },
    records: [transportAttendanceRecordSchema],
  },
  { timestamps: true }
);

transportAttendanceSchema.index(
  { schoolId: 1, routeId: 1, date: 1, tripType: 1 },
  { unique: true }
);

export const TransportAttendance = mongoose.model(
  'TransportAttendance',
  transportAttendanceSchema
);
