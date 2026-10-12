import mongoose from 'mongoose';

/**
 * A school's own list of examination types ("Unit Test", "Half Yearly", ...).
 * `Exam.examType` stores the immutable `code`, so renaming a type relabels every
 * exam that uses it and a type that is in use can only be deactivated, not deleted.
 */
const examTypeSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

examTypeSchema.index({ schoolId: 1, code: 1 }, { unique: true });
examTypeSchema.index({ schoolId: 1, name: 1 }, { unique: true });

examTypeSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    code: this.code,
    // `value`/`label` so existing <select> option lists can consume it as-is.
    value: this.code,
    label: this.name,
    name: this.name,
    description: this.description || '',
    sortOrder: this.sortOrder || 0,
    isActive: this.isActive !== false,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const ExamType = mongoose.model('ExamType', examTypeSchema);
