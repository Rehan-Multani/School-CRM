import mongoose from 'mongoose';

export const FEE_STRUCTURE_STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'];

const feeStructureSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: FEE_STRUCTURE_STATUSES,
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

feeStructureSchema.index({ schoolId: 1, academicYearId: 1, classId: 1 }, { unique: true });
feeStructureSchema.index({ schoolId: 1, status: 1 });

feeStructureSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    academicYearId: this.academicYearId.toString(),
    classId: this.classId.toString(),
    name: this.name,
    description: this.description,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);
