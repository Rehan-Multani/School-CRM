import mongoose from 'mongoose';

const assetCategorySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: '', trim: true, uppercase: true },
    description: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

assetCategorySchema.index({ schoolId: 1, name: 1 }, { unique: true });

assetCategorySchema.methods.toPublicJSON = function toPublicJSON(extra = {}) {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    name: this.name,
    code: this.code || '',
    description: this.description || '',
    assetCount: extra.assetCount !== undefined ? extra.assetCount : 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const AssetCategory = mongoose.model('AssetCategory', assetCategorySchema);
