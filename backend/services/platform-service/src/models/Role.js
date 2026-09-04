import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: '', trim: true },
    isSystem: { type: Boolean, default: false },
    permissions: { type: [String], default: [] },
  },
  { timestamps: true }
);

roleSchema.index({ schoolId: 1, key: 1 }, { unique: true });

roleSchema.methods.toPublicJSON = function toPublicJSON(extra = {}) {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    name: this.name,
    key: this.key,
    description: this.description || '',
    isSystem: this.isSystem,
    permissions: this.permissions || [],
    userCount: extra.userCount !== undefined ? extra.userCount : 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Role = mongoose.model('Role', roleSchema);
