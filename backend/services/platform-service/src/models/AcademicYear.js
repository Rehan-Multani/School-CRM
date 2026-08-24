import mongoose from 'mongoose';

const academicYearSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'],
      default: 'DRAFT',
    },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

academicYearSchema.index({ schoolId: 1, name: 1 }, { unique: true });
academicYearSchema.index({ schoolId: 1, code: 1 }, { unique: true });
academicYearSchema.index({ schoolId: 1, isCurrent: 1 });

academicYearSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    name: this.name,
    code: this.code,
    startDate: this.startDate,
    endDate: this.endDate,
    status: this.status,
    isCurrent: this.isCurrent,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const AcademicYear = mongoose.model('AcademicYear', academicYearSchema);
