import mongoose from 'mongoose';

export const FEE_STRUCTURE_STATUSES = ['ACTIVE', 'INACTIVE'];
export const FEE_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME'];

/**
 * Fee Structure — defines fees for a class in an academic year.
 *
 * Example:
 * - Academic Year: 2026-27
 * - Class: 5
 * - Items: [
 *     { feeHeadId, amount: 2000, frequency: 'YEARLY' },
 *     { feeHeadId, amount: 1000, frequency: 'YEARLY' }
 *   ]
 * - Total: ₹3,000 per year
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
      required: true,
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

feeStructureSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    academicYearId: this.academicYearId.toString(),
    classId: this.classId.toString(),
    items: this.items.map((item) => ({
      feeHeadId: item.feeHeadId.toString(),
      amount: item.amount,
      frequency: item.frequency,
    })),
    totalAmount: this.totalAmount,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeeStructure = mongoose.model('FeeStructure', feeStructureSchema);
