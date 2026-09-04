import mongoose from 'mongoose';

export const STUDENT_ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE'];

const entrySchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, default: '', trim: true },
    rollNumber: { type: String, default: '', trim: true },
    status: { type: String, enum: STUDENT_ATTENDANCE_STATUSES, default: 'PRESENT' },
    note: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const studentAttendanceSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: null },
    className: { type: String, default: '', trim: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    sectionName: { type: String, default: '', trim: true },
    date: { type: String, required: true }, // YYYY-MM-DD (local)
    entries: { type: [entrySchema], default: [] },
    markedByName: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

studentAttendanceSchema.index({ schoolId: 1, sectionId: 1, date: 1 }, { unique: true });
studentAttendanceSchema.index({ schoolId: 1, date: 1 });

studentAttendanceSchema.methods.summary = function () {
  const s = { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, LEAVE: 0 };
  (this.entries || []).forEach((e) => {
    s[e.status] = (s[e.status] || 0) + 1;
  });
  const total = this.entries.length;
  const present = s.PRESENT + s.LATE + s.HALF_DAY;
  return { ...s, total, presentRate: total ? Math.round((present / total) * 100) : 0 };
};

studentAttendanceSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    sectionId: this.sectionId.toString(),
    sectionName: this.sectionName || '',
    className: this.className || '',
    classId: this.classId ? this.classId.toString() : null,
    academicYearId: this.academicYearId ? this.academicYearId.toString() : null,
    date: this.date,
    entries: (this.entries || []).map((e) => ({
      studentId: e.studentId.toString(),
      studentName: e.studentName || '',
      rollNumber: e.rollNumber || '',
      status: e.status,
      note: e.note || '',
    })),
    summary: this.summary(),
    markedByName: this.markedByName || '',
    updatedAt: this.updatedAt,
  };
};

export const StudentAttendance = mongoose.model('StudentAttendance', studentAttendanceSchema);
