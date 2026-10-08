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
 * The plaintext OTP is never logged. A bcrypt hash is what verification uses.
 * An AES-GCM encrypted copy is kept ONLY so the guardian's own parent app can
 * display the code (it is also sent by SMS); it is returned by no teacher/admin
 * API, and both copies are nulled the moment a session leaves the active state.
 */
const BCRYPT_ROUNDS = 10;

// Key for the parent-visible copy of the OTP: derived from the server's JWT
// secret (always present, never in the DB) unless a dedicated key is set.
function cipherKey() {
  const base = process.env.SAFE_PICKUP_CIPHER_KEY || env.jwtSecret;
  return crypto.createHash('sha256').update(`safe-pickup-otp|${base}`).digest();
}

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

  /** AES-256-GCM → "v1.<iv>.<tag>.<ciphertext>" (base64url). */
  encryptOtp(otp) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', cipherKey(), iv);
    const ct = Buffer.concat([cipher.update(String(otp), 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), ct.toString('base64url')].join('.');
  }

  /** @returns {string|null} the OTP, or null if missing / tampered / wrong key. */
  decryptOtp(payload) {
    try {
      const [v, iv, tag, ct] = String(payload || '').split('.');
      if (v !== 'v1' || !iv || !tag || !ct) return null;
      const d = crypto.createDecipheriv('aes-256-gcm', cipherKey(), Buffer.from(iv, 'base64url'));
      d.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
    } catch {
      return null;
    }
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
