import mongoose from 'mongoose';

export const LIBRARY_CATEGORY_STATUSES = ['ACTIVE', 'INACTIVE'];

const libraryCategorySchema = new mongoose.Schema(
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
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: LIBRARY_CATEGORY_STATUSES,
      default: 'ACTIVE',
    },
  },
  { timestamps: true }
);

libraryCategorySchema.index({ schoolId: 1, name: 1 }, { unique: true });

libraryCategorySchema.methods.toPublicJSON = function toPublicJSON(stats = {}) {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    name: this.name,
    description: this.description || '',
    status: this.status,
    isActive: this.status === 'ACTIVE',
    count: stats.count || 0,
    totalCopies: stats.totalCopies || 0,
    availableCopies: stats.availableCopies || 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const LibraryCategory = mongoose.model('LibraryCategory', libraryCategorySchema);
