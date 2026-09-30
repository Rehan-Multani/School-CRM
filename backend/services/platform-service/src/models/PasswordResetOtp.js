import mongoose from 'mongoose';

export const PASSWORD_RESET_ROLES = ['TEACHER', 'STUDENT', 'PARENT', 'DRIVER'];

/**
 * Forgot-password OTP for the mobile-app roles (teacher / student / parent /
 * driver). One document per request; only hashes are stored — the plaintext
 * OTP goes out by SMS and the reset token back to the app, never to the DB.
 *
 * Lifecycle: OTP_SENT → (verify) VERIFIED → (reset) USED. Mongo's TTL index
 * sweeps stale rows an hour after they expire.
 */
const passwordResetOtpSchema = new mongoose.Schema(
  {
    role: { type: String, enum: PASSWORD_RESET_ROLES, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
    status: { type: String, enum: ['OTP_SENT', 'VERIFIED', 'USED'], default: 'OTP_SENT' },
    otpHash: { type: String, default: '', select: false },
    otpExpiresAt: { type: Date, required: true },
    otpAttempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    lastOtpSentAt: { type: Date, default: null },
    resetTokenHash: { type: String, default: '', select: false },
    resetTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

passwordResetOtpSchema.index({ role: 1, accountId: 1, createdAt: -1 });
passwordResetOtpSchema.index({ resetTokenHash: 1 });
passwordResetOtpSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 60 * 60 });

export const PasswordResetOtp = mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
