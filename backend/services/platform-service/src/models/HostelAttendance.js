import mongoose from 'mongoose';

const hostelAttendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelBed',
      default: null,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelRoom',
      default: null,
    },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'OUTING', 'LEAVE', 'MEDICAL'],
      default: 'PRESENT',
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const hostelAttendanceSchema = new mongoose.Schema(
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
    date: {
      type: String, // YYYY-MM-DD for easy daily lookup
      required: true,
      index: true,
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
    outingCount: {
      type: Number,
      default: 0,
    },
    leaveCount: {
      type: Number,
      default: 0,
    },
    medicalCount: {
      type: Number,
      default: 0,
    },
    records: [hostelAttendanceRecordSchema],
  },
  { timestamps: true }
);

hostelAttendanceSchema.index({ schoolId: 1, hostelId: 1, date: 1 }, { unique: true });

export const HostelAttendance = mongoose.model('HostelAttendance', hostelAttendanceSchema);
