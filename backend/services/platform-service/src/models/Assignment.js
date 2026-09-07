import mongoose from 'mongoose';

export const ASSIGNMENT_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED'];

const assignmentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: null, index: true },
    className: { type: String, default: '', trim: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null, index: true },
    sectionName: { type: String, default: '', trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    subjectName: { type: String, default: '', trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    teacherName: { type: String, default: '', trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    instructions: { type: String, default: '', trim: true },
    maxMarks: { type: Number, default: 100, min: 1 },
    assignedDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    attachments: { type: [{ name: String, url: String }], default: [] },
    status: { type: String, enum: ASSIGNMENT_STATUSES, default: 'PUBLISHED', index: true },
    submissionCount: { type: Number, default: 0, min: 0 },
    gradedCount: { type: Number, default: 0, min: 0 },
    createdByName: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ schoolId: 1, teacherId: 1, createdAt: -1 });
assignmentSchema.index({ schoolId: 1, sectionId: 1, dueDate: -1 });

assignmentSchema.methods.toPublicJSON = function toPublicJSON() {
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
    description: this.description || '',
    instructions: this.instructions || '',
    maxMarks: this.maxMarks,
    assignedDate: this.assignedDate,
    dueDate: this.dueDate,
    attachments: this.attachments || [],
    status: this.status,
    submissionCount: this.submissionCount || 0,
    gradedCount: this.gradedCount || 0,
    overdue: this.status === 'PUBLISHED' && this.dueDate && new Date(this.dueDate).getTime() < Date.now(),
    createdByName: this.createdByName || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Assignment = mongoose.model('Assignment', assignmentSchema);
