import mongoose from 'mongoose';

/**
 * Parent APK account — 8th school-tenant identity. Mirrors the Teacher/Student
 * credential shape. A parent is linked to one or more Students via ParentStudent.
 * `passwordHash` is select:false and never surfaced by toPublicJSON.
 */
const parentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true }, // primary login identifier
    photo: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },

    account: {
      createLoginAccount: { type: Boolean, default: false },
      loginEmail: { type: String, default: '', trim: true, lowercase: true },
      username: { type: String, default: '', trim: true },
      accountStatus: { type: String, enum: ['', 'PENDING', 'ACTIVE', 'INACTIVE'], default: '' },
    },
    passwordHash: { type: String, default: '', select: false },
    mustResetPassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
    // Bumped on password change / reset / logout / account delete. Parent JWTs
    // carry it as `tv`; requireParent rejects a stale one (revocation).
    tokenVersion: { type: Number, default: 0 },
    // Set when the user deleted their APP account (login removed). The
    // school's records about them are retained. Cleared when a new password
    // is issued.
    appAccountDeletedAt: { type: Date, default: null },
    notificationPrefs: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

// Non-unique (like Teacher/Student): the APK login service de-dupes in code and
// 409s on a cross-school collision — a sparse-unique here has crash-looped boot.
parentSchema.index({ schoolId: 1, 'account.loginEmail': 1 });
parentSchema.index({ schoolId: 1, phone: 1 });
parentSchema.index({ schoolId: 1, email: 1 });

parentSchema.pre('save', function bumpTokenVersionOnPasswordChange() {
  if (!this.isNew && this.isModified('passwordHash')) {
    this.tokenVersion = (this.tokenVersion || 0) + 1;
    // A fresh password (admin re-issue / reset) re-opens a deleted app account.
    if (this.passwordHash) this.appAccountDeletedAt = null;
  }
});

parentSchema.methods.toPublicJSON = function toPublicJSON() {
  const fullName = [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    firstName: this.firstName,
    lastName: this.lastName,
    fullName,
    email: this.email || this.account?.loginEmail || '',
    phone: this.phone,
    photo: this.photo,
    address: this.address,
    status: this.status,
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

export const Parent = mongoose.model('Parent', parentSchema);
