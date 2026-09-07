import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

/**
 * OTP abstraction for Student Safe Pickup.
 *
 * STAGING: `SAFE_PICKUP_OTP_MODE=static` -> always returns SAFE_PICKUP_STATIC_OTP
 * (default "123456"). PRODUCTION: set `=random` for a cryptographically secure
 * N-digit code. The rest of the pickup flow never branches on the mode — it only
 * ever calls generate / hash / verify — so swapping in a real SMS provider is a
 * config change, not a code change.
 *
 * The plaintext OTP is never logged, returned by an API, or stored. Only a
 * bcrypt hash is persisted, and it is nulled the moment a session leaves the
 * active state.
 */
const BCRYPT_ROUNDS = 10;

class SafePickupOtpService {
  get config() {
    return env.safePickup;
  }

  /** @returns {string} the plaintext OTP (caller must hash before persisting). */
  generateOtp() {
    const len = this.config.otpLength;
    if (this.config.otpMode === 'static') {
      return String(this.config.staticOtp).padStart(len, '0').slice(0, len);
    }
    const max = 10 ** len;
    return String(crypto.randomInt(0, max)).padStart(len, '0');
  }

  async hashOtp(otp) {
    return bcrypt.hash(String(otp), BCRYPT_ROUNDS);
  }

  /** Constant-time compare via bcrypt. */
  async verifyOtp(otp, hash) {
    if (!hash) return false;
    try {
      return await bcrypt.compare(String(otp || ''), hash);
    } catch {
      return false;
    }
  }

  expiryDate(from = new Date()) {
    return new Date(from.getTime() + this.config.otpExpirySeconds * 1000);
  }

  isExpired(session) {
    return !session?.otpExpiresAt || new Date(session.otpExpiresAt).getTime() <= Date.now();
  }

  attemptsLeft(session) {
    return Math.max(0, (session?.maxOtpAttempts ?? this.config.maxAttempts) - (session?.otpAttempts || 0));
  }

  /** Seconds a teacher must still wait before "Resend OTP" is allowed (0 = ready). */
  resendCooldownLeft(session) {
    if (!session?.lastOtpSentAt) return 0;
    const elapsed = (Date.now() - new Date(session.lastOtpSentAt).getTime()) / 1000;
    return Math.max(0, Math.ceil(this.config.resendCooldownSeconds - elapsed));
  }

  resendsLeft(session) {
    return Math.max(0, (session?.maxResends ?? this.config.maxResends) - (session?.resendCount || 0));
  }

  /** Dev-only breadcrumb so QA can grab the code without a real SMS. Never in prod. */
  debugLogStagingOtp(sessionId, otp) {
    if (env.nodeEnv !== 'production' && this.config.otpMode === 'static') {
      // eslint-disable-next-line no-console
      console.log(`[safe-pickup] staging OTP for session ${sessionId}: ${otp}`);
    }
  }
}

export const safePickupOtpService = new SafePickupOtpService();
