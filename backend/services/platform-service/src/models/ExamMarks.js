import mongoose from 'mongoose';

const examMarksSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true, index: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    marksObtained: { type: Number, default: null },
    maxMarks: { type: Number, required: true, default: 100 },
    passingMarks: { type: Number, default: 33 },
    attendanceStatus: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'MEDICAL', 'EXEMPTED'],
      default: 'PRESENT',
    },
    remarks: { type: String, default: '', trim: true },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
  },
  { timestamps: true }
);

examMarksSchema.index({ examId: 1, studentId: 1, subjectId: 1 }, { unique: true });
examMarksSchema.index({ examId: 1, sectionId: 1, subjectId: 1 });

examMarksSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    examId: this.examId.toString(),
    classId: this.classId.toString(),
    sectionId: this.sectionId.toString(),
    subjectId: this.subjectId.toString(),
    studentId: this.studentId.toString(),
    marksObtained: this.marksObtained,
    maxMarks: this.maxMarks,
    passingMarks: this.passingMarks,
    attendanceStatus: this.attendanceStatus,
    remarks: this.remarks,
    gradedBy: this.gradedBy ? this.gradedBy.toString() : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const ExamMarks = mongoose.model('ExamMarks', examMarksSchema);
