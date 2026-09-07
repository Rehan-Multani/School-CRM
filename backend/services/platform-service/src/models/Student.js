import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    admissionNumber: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'OTHER' },
    dateOfBirth: { type: Date, default: null },
    photo: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    parentName: { type: String, default: '', trim: true },
    parentPhone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    documents: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ aadhaar: [], marksheet: [] })
    },
    // ---- Student APK login (additive; mirrors Teacher.account; passwordHash never exposed by toPublicJSON) ----
    account: {
      createLoginAccount: { type: Boolean, default: false },
      loginEmail: { type: String, default: '', trim: true, lowercase: true },
      username: { type: String, default: '', trim: true },
      accountStatus: { type: String, enum: ['', 'PENDING', 'ACTIVE', 'INACTIVE'], default: '' },
    },
    passwordHash: { type: String, default: '', select: false },
    mustResetPassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    // Free-form per-student notification preferences for the APK Settings screen.
    notificationPrefs: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

studentSchema.index({ schoolId: 1, admissionNumber: 1 }, { unique: true });
studentSchema.index({ schoolId: 1, firstName: 1, lastName: 1 });
studentSchema.index({ schoolId: 1, email: 1 });
// Non-unique (like Teacher): the APK login service de-dupes in code and 409s on
// a cross-school collision — a sparse-unique here has historically crash-looped boot.
studentSchema.index({ schoolId: 1, 'account.loginEmail': 1 });
studentSchema.index({ schoolId: 1, 'account.username': 1 });

studentSchema.methods.toPublicJSON = function toPublicJSON() {
  const fullName = [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    admissionNumber: this.admissionNumber,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName,
    gender: this.gender,
    dateOfBirth: this.dateOfBirth,
    photo: this.photo,
    email: this.email,
    phone: this.phone,
    parentName: this.parentName,
    parentPhone: this.parentPhone,
    address: this.address,
    status: this.status,
    documents: this.documents || { aadhaar: [], marksheet: [] },
    account: {
      loginEmail: this.account?.loginEmail || '',
      username: this.account?.username || '',
      accountStatus: this.account?.accountStatus || '',
    },
    mustResetPassword: Boolean(this.mustResetPassword),
    lastLoginAt: this.lastLoginAt || null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Student = mongoose.model('Student', studentSchema);
