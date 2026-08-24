import mongoose from 'mongoose';

const examResultSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    rollNumber: { type: String, default: '', trim: true },
    totalMarks: { type: Number, required: true, default: 0 },
    maxTotalMarks: { type: Number, required: true, default: 0 },
    percentage: { type: Number, required: true, default: 0 },
    grade: { type: String, default: 'F' },
    gpa: { type: Number, default: 0 },
    result: {
      type: String,
      enum: ['PASS', 'FAIL', 'COMPARTMENT', 'WITHHELD'],
      default: 'PASS',
    },
    rank: { type: Number, default: 0 },
    subjectResults: [
      {
        subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
        subjectName: { type: String, default: '' },
        subjectCode: { type: String, default: '' },
        marksObtained: { type: Number, default: null },
        maxMarks: { type: Number, default: 100 },
        passingMarks: { type: Number, default: 33 },
        attendanceStatus: { type: String, default: 'PRESENT' },
        grade: { type: String, default: 'F' },
        isPassed: { type: Boolean, default: true },
      },
    ],
    remarks: { type: String, default: '' },
  },
  { timestamps: true }
);

examResultSchema.index({ examId: 1, studentId: 1 }, { unique: true });
examResultSchema.index({ examId: 1, sectionId: 1, rank: 1 });

examResultSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    examId: this.examId.toString(),
    academicYearId: this.academicYearId.toString(),
    classId: this.classId.toString(),
    sectionId: this.sectionId.toString(),
    studentId: this.studentId.toString(),
    rollNumber: this.rollNumber,
    totalMarks: this.totalMarks,
    maxTotalMarks: this.maxTotalMarks,
    percentage: this.percentage,
    grade: this.grade,
    gpa: this.gpa,
    result: this.result,
    rank: this.rank,
    subjectResults: this.subjectResults,
    remarks: this.remarks,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const ExamResult = mongoose.model('ExamResult', examResultSchema);
