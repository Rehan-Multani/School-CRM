import mongoose from 'mongoose';

export const FEE_HEAD_STATUSES = ['ACTIVE', 'INACTIVE'];
export const FEE_CATEGORIES = ['ACADEMIC', 'TRANSPORT', 'HOSTEL', 'ACTIVITY', 'OTHER'];

/**
 * Fee Head — a category of fee the school charges.
 *
 * Examples: Tuition, Transport, Exam, Annual, Admission, Other
 * Fee heads are the building blocks of fee structures.
 */
const feeHeadSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    category: {
      type: String,
      enum: FEE_CATEGORIES,
      default: 'ACADEMIC',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    status: {
      type: String,
      enum: FEE_HEAD_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

// Unique name and code per school
feeHeadSchema.index({ schoolId: 1, name: 1 }, { unique: true });
feeHeadSchema.index({ schoolId: 1, code: 1 }, { unique: true });

feeHeadSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId?.toString(),
    name: this.name,
    code: this.code,
    category: this.category || 'ACADEMIC',
    description: this.description,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeeHead = mongoose.model('FeeHead', feeHeadSchema);
