import mongoose from 'mongoose';

export const APP_ROLES = ['TEACHER', 'STUDENT', 'PARENT', 'TRANSPORT'];

/**
 * One row per "force logout" an administrator triggered for the mobile app.
 *
 * The sign-out itself is the tokenVersion bump on the affected accounts; this
 * row is the audit trail, and it is what the app reads (GET
 * /app-config/logout-notice) to show "you were signed out by the
 * administrator" with the admin's message instead of a bare "session ended".
 *
 * `schoolId: null` = every school.
 */
const appForceLogoutSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null, index: true },
    schoolName: { type: String, default: '', trim: true },
    roles: [{ type: String, enum: APP_ROLES, required: true }],
    message: { type: String, default: '', trim: true },
    createdBy: { type: String, default: '' },
    createdByRole: { type: String, default: '' },
    // Accounts whose sessions were ended, per role, and devices the push reached.
    affected: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    devicesNotified: { type: Number, default: 0 },
  },
  { timestamps: true }
);

appForceLogoutSchema.index({ createdAt: -1 });

appForceLogoutSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId ? this.schoolId.toString() : null,
    schoolName: this.schoolName || '',
    roles: this.roles || [],
    message: this.message || '',
    createdBy: this.createdBy || '',
    createdByRole: this.createdByRole || '',
    affected: this.affected || {},
    devicesNotified: this.devicesNotified || 0,
    createdAt: this.createdAt,
  };
};

export const AppForceLogout = mongoose.model('AppForceLogout', appForceLogoutSchema);
