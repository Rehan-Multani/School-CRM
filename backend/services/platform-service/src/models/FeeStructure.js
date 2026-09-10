import mongoose from 'mongoose';

export const FEE_STRUCTURE_STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'];
export const FEE_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME'];

/**
 * Fee Structure — defines fees for a class in an academic year.
 * Line items are stored primarily in FeeStructureItem collection,
 * with structure header defining the class, year, and name.
 */
const feeStructureSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolClass',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    items: [
      {
        feeHeadId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'FeeHead',
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        frequency: {
          type: String,
          enum: FEE_FREQUENCIES,
          default: 'YEARLY',
        },
      },
    ],
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: FEE_STRUCTURE_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

// One structure per year/class combination
feeStructureSchema.index({ schoolId: 1, academicYearId: 1, classId: 1 }, { unique: true });
feeStructureSchema.index({ schoolId: 1, status: 1 });

feeStructureSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId?.toString(),
    academicYearId: this.academicYearId?._id?.toString ? this.academicYearId._id.toString() : (this.academicYearId?.toString ? this.academicYearId.toString() : this.academicYearId),
    classId: this.classId?._id?.toString ? this.classId._id.toString() : (this.classId?.toString ? this.classId.toString() : this.classId),
    name: this.name,
    description: this.description || '',
    totalAmount: this.totalAmount || 0,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);
