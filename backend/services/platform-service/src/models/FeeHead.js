import mongoose from 'mongoose';

export const FEE_CATEGORIES = ['ACADEMIC', 'TRANSPORT', 'HOSTEL', 'ACTIVITY', 'OTHER'];
export const FEE_HEAD_STATUSES = ['ACTIVE', 'INACTIVE'];

const feeHeadSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: '', trim: true },
    category: {
      type: String,
      enum: FEE_CATEGORIES,
      default: 'ACADEMIC',
    },
    status: {
      type: String,
      enum: FEE_HEAD_STATUSES,
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

feeHeadSchema.index({ schoolId: 1, name: 1 }, { unique: true });
feeHeadSchema.index({ schoolId: 1, code: 1 }, { unique: true });
feeHeadSchema.index({ schoolId: 1, category: 1 });

feeHeadSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    name: this.name,
    code: this.code,
    description: this.description,
    category: this.category,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeeHead = mongoose.model('FeeHead', feeHeadSchema);
