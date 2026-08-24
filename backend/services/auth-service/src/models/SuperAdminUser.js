import mongoose from 'mongoose';

const superAdminUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['SuperAdmin'], default: 'SuperAdmin' },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

superAdminUserSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    avatar: this.avatar || '',
    role: 'Super Admin',
  };
};

export const SuperAdminUser = mongoose.model('SuperAdminUser', superAdminUserSchema);
