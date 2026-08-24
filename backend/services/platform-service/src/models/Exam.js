import mongoose from 'mongoose';

const examSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    name: { type: String, required: true, trim: true },
    examType: {
      type: String,
      enum: ['UNIT_TEST', 'MONTHLY_TEST', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'PRE_BOARD', 'OTHER'],
      default: 'HALF_YEARLY',
    },
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
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Exam = mongoose.model('Exam', examSchema);
