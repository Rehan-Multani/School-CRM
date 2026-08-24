import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    subjectType: {
      type: String,
      enum: ['THEORY', 'PRACTICAL', 'BOTH', 'ACTIVITY'],
      default: 'THEORY',
    },
    maxMarks: { type: Number, default: 100, min: 1 },
    passingMarks: { type: Number, default: 33, min: 0 },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

subjectSchema.index({ schoolId: 1, name: 1 }, { unique: true });
subjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });

subjectSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    name: this.name,
    code: this.code,
    subjectType: this.subjectType,
    maxMarks: this.maxMarks,
    passingMarks: this.passingMarks,
    description: this.description,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Subject = mongoose.model('Subject', subjectSchema);
