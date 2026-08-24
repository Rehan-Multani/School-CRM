import mongoose from 'mongoose';

const sectionSubjectSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    maxMarks: { type: Number, default: 100, min: 1 },
    passingMarks: { type: Number, default: 33, min: 0 },
    isOptional: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

sectionSubjectSchema.index({ schoolId: 1, academicYearId: 1, sectionId: 1, subjectId: 1 }, { unique: true });

sectionSubjectSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    academicYearId: this.academicYearId.toString(),
    classId: this.classId.toString(),
    sectionId: this.sectionId.toString(),
    subjectId: this.subjectId.toString(),
    teacherId: this.teacherId ? this.teacherId.toString() : null,
    maxMarks: this.maxMarks,
    passingMarks: this.passingMarks,
    isOptional: this.isOptional,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SectionSubject = mongoose.model('SectionSubject', sectionSubjectSchema);
