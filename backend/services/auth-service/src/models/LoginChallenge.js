import mongoose from 'mongoose';

/**
 * Pending second step of a Super Admin sign-in: the password was correct and an
 * OTP was emailed, but no session exists until the OTP is verified.
 *
 * Only hashes are stored — `challengeHash` (the opaque id handed to the browser)
 * and `otpHash` (HMAC of the code) — so a DB read yields nothing usable.
 */
const loginChallengeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdminUser', required: true, index: true },
    challengeHash: { type: String, required: true, unique: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    createdByIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

// Mongo reaps the row once the code can no longer be used.
loginChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LoginChallenge = mongoose.model('LoginChallenge', loginChallengeSchema);
