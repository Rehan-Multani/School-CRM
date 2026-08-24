import mongoose from 'mongoose';

export const FEE_FREQUENCIES = ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'];

const feeStructureItemSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    feeStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true, index: true },
    feeHeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeHead', required: true },
    amount: { type: Number, required: true, min: 0 },
    frequency: {
      type: String,
      enum: FEE_FREQUENCIES,
      default: 'MONTHLY',
    },
    dueDay: { type: Number, default: 10, min: 1, max: 28 },
    isOptional: { type: Boolean, default: false },
    applicableFrom: { type: Date, default: null },
    applicableTo: { type: Date, default: null },
  },
  { timestamps: true }
);

feeStructureItemSchema.index({ feeStructureId: 1, feeHeadId: 1 }, { unique: true });

feeStructureItemSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    feeStructureId: this.feeStructureId.toString(),
    feeHeadId: this.feeHeadId.toString(),
    amount: this.amount,
    frequency: this.frequency,
    dueDay: this.dueDay,
    isOptional: this.isOptional,
    applicableFrom: this.applicableFrom,
    applicableTo: this.applicableTo,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeeStructureItem = mongoose.model('FeeStructureItem', feeStructureItemSchema);
