import mongoose from 'mongoose';

const examSubjectSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    subjectName: { type: String, required: true, trim: true },
    subjectCode: { type: String, default: '', trim: true },
    maxMarks: { type: Number, required: true, default: 100, min: 1 },
    passingMarks: { type: Number, required: true, default: 33, min: 0 },
  },
  { timestamps: true }
);

examSubjectSchema.index({ examId: 1, classId: 1, subjectId: 1 }, { unique: true });

examSubjectSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    examId: this.examId.toString(),
    classId: this.classId.toString(),
    subjectId: this.subjectId.toString(),
    subjectName: this.subjectName,
    subjectCode: this.subjectCode,
    maxMarks: this.maxMarks,
    passingMarks: this.passingMarks,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const ExamSubject = mongoose.model('ExamSubject', examSubjectSchema);
