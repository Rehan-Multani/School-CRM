import mongoose from 'mongoose';

export const OTP_LOGIN_ROLES = ['STUDENT', 'PARENT'];

/**
 * Mobile-OTP sign-in for the student and parent apps. One document per
 * request, keyed by (role, phone) — the number is all the caller has typed, and
 * it may belong to several accounts (siblings, two schools). Only hashes are
 * stored: the plaintext OTP goes out by SMS, the selection token back to the app.
 *
 * Lifecycle: OTP_SENT → (verify) USED, or → VERIFIED → (choose account) USED
 * when the number has more than one account. Mongo's TTL index sweeps stale
 * rows an hour after they expire.
 */
const loginOtpSchema = new mongoose.Schema(
  {
    role: { type: String, enum: OTP_LOGIN_ROLES, required: true },
    phone: { type: String, required: true, trim: true },
    status: { type: String, enum: ['OTP_SENT', 'VERIFIED', 'USED'], default: 'OTP_SENT' },
    otpHash: { type: String, default: '', select: false },
    otpExpiresAt: { type: Date, required: true },
    otpAttempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    lastOtpSentAt: { type: Date, default: null },
    selectTokenHash: { type: String, default: '', select: false },
    selectTokenExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

loginOtpSchema.index({ role: 1, phone: 1, createdAt: -1 });
loginOtpSchema.index({ selectTokenHash: 1 });
loginOtpSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 60 * 60 });

export const LoginOtp = mongoose.model('LoginOtp', loginOtpSchema);
