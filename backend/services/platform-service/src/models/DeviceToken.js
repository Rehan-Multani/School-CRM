import mongoose from 'mongoose';

export const DEVICE_ROLES = [
  'principal',
  'school-admin',
  'accountant',
  'teacher',
  'student',
  'parent',
  'hr',
  'librarian',
  'transport',
];

const deviceTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, trim: true, unique: true },
    role: { type: String, required: true, enum: DEVICE_ROLES },
    schoolId: { type: String, default: '', trim: true },
    userId: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

deviceTokenSchema.index({ role: 1, schoolId: 1 });

export const DeviceToken = mongoose.model('DeviceToken', deviceTokenSchema);
