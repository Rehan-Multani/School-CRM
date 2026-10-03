import mongoose from 'mongoose';

/**
 * One-time hand-off for "Login as school" (Super Admin → a school's admin panel).
 *
 * The Super Admin panel and the school panel are separate sites, so the session
 * cannot be shared directly. The Super Admin gets a random code that is valid
 * once, for a minute; the school panel swaps it for a school-admin session.
 * Only the SHA-256 of the code is stored, and the row deletes itself on expiry.
 */
const loginAsCodeSchema = new mongoose.Schema(
  {
    codeHash: { type: String, required: true, unique: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    actorId: { type: String, default: '' },
    actorName: { type: String, default: 'Super Admin' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

loginAsCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LoginAsCode = mongoose.model('LoginAsCode', loginAsCodeSchema);
