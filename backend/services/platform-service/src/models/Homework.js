import mongoose from 'mongoose';

export const HOMEWORK_STATUSES = ['ASSIGNED', 'CLOSED'];

const homeworkSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null,
    },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: null, index: true },
    className: { type: String, default: '', trim: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null, index: true },
    sectionName: { type: String, default: '', trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    subjectName: { type: String, default: '', trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    teacherName: { type: String, default: '', trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    assignedDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    attachments: {
      type: [{ name: String, url: String }],
      default: [],
    },
    status: { type: String, enum: HOMEWORK_STATUSES, default: 'ASSIGNED', index: true },
    totalStudents: { type: Number, default: 0, min: 0 },
    submittedCount: { type: Number, default: 0, min: 0 },
    evaluatedCount: { type: Number, default: 0, min: 0 },
    createdByName: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

homeworkSchema.index({ schoolId: 1, assignedDate: -1 });

function pct(part, whole) {
  if (!whole || whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

homeworkSchema.methods.toPublicJSON = function toPublicJSON() {
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
    title: this.title,
    description: this.description,
    assignedDate: this.assignedDate,
    dueDate: this.dueDate,
    attachments: this.attachments || [],
    status: this.status,
    totalStudents: this.totalStudents,
    submittedCount: this.submittedCount,
    evaluatedCount: this.evaluatedCount,
    submissionRate: pct(this.submittedCount, this.totalStudents),
    evaluationRate: pct(this.evaluatedCount, this.submittedCount),
    pendingEvaluation: Math.max(0, (this.submittedCount || 0) - (this.evaluatedCount || 0)),
    overdue: this.status === 'ASSIGNED' && this.dueDate && new Date(this.dueDate).getTime() < Date.now(),
    createdByName: this.createdByName || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Homework = mongoose.model('Homework', homeworkSchema);
