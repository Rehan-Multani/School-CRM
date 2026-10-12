import mongoose from 'mongoose';

const examSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    name: { type: String, required: true, trim: true },
    // Code of one of the school's ExamType rows (validated in exam.service) —
    // no longer a fixed enum, since each school manages its own list.
    examType: { type: String, trim: true, uppercase: true, default: 'HALF_YEARLY' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    classIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass' }],
    gradingType: {
      type: String,
      enum: ['PERCENTAGE', 'GPA', 'GRADE_LETTER'],
      default: 'PERCENTAGE',
    },
    description: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PUBLISHED', 'CANCELLED'],
      default: 'DRAFT',
    },
    // Admin on/off switch, independent of the lifecycle status above. Exams are never deleted from the UI.
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

examSchema.index({ schoolId: 1, academicYearId: 1, name: 1 }, { unique: true });

examSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    academicYearId: this.academicYearId.toString(),
    name: this.name,
    examType: this.examType,
    startDate: this.startDate,
    endDate: this.endDate,
    classIds: (this.classIds || []).map((id) => id.toString()),
    gradingType: this.gradingType,
    description: this.description,
    status: this.status,
    isActive: this.isActive !== false,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Exam = mongoose.model('Exam', examSchema);
