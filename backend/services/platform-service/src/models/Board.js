import mongoose from 'mongoose';

const boardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    // Lower-cased name — case-insensitive uniqueness.
    nameKey: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

boardSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    description: this.description || '',
    isActive: this.isActive !== false,
    createdBy: this.createdBy || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Board = mongoose.models.Board || mongoose.model('Board', boardSchema);
