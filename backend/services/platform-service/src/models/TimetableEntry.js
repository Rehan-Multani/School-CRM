import mongoose from 'mongoose';

export const TIMETABLE_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const timetableEntrySchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    className: { type: String, default: '', trim: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    sectionName: { type: String, default: '', trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, default: '', trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null, index: true },
    teacherName: { type: String, default: '', trim: true },
    dayOfWeek: { type: String, enum: TIMETABLE_DAYS, required: true },
    periodNumber: { type: Number, required: true, min: 1, max: 15 },
    startTime: { type: String, required: true, trim: true }, // 'HH:MM' 24h
    endTime: { type: String, required: true, trim: true },
    room: { type: String, default: '', trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

// One subject slot per section per period per day.
timetableEntrySchema.index({ schoolId: 1, sectionId: 1, dayOfWeek: 1, periodNumber: 1 }, { unique: true });
// Teacher's own week — the hot path for the APK.
timetableEntrySchema.index({ schoolId: 1, teacherId: 1, dayOfWeek: 1, periodNumber: 1 });

timetableEntrySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    academicYearId: this.academicYearId ? this.academicYearId.toString() : null,
    classId: this.classId ? this.classId.toString() : null,
    className: this.className || '',
    sectionId: this.sectionId ? this.sectionId.toString() : null,
    sectionName: this.sectionName || '',
    subjectId: this.subjectId ? this.subjectId.toString() : null,
    subjectName: this.subjectName || '',
    teacherId: this.teacherId ? this.teacherId.toString() : null,
    teacherName: this.teacherName || '',
    dayOfWeek: this.dayOfWeek,
    periodNumber: this.periodNumber,
    startTime: this.startTime,
    endTime: this.endTime,
    room: this.room || '',
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const TimetableEntry = mongoose.model('TimetableEntry', timetableEntrySchema);
