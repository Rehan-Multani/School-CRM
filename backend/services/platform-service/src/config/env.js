import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const platformRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.resolve(platformRoot, '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';

// P1: no hardcoded JWT secret fallback. A missing/weak secret means anyone can
// forge tokens for any role/school. Require a strong secret everywhere; in
// non-production only, fall back to a per-process random value (breaks existing
// sessions on restart, which is the intended nudge to set JWT_SECRET).
function requireSecret(name) {
  const value = (process.env[name] || '').trim();
  if (value && value.length >= 32) return value;
  if (NODE_ENV === 'production') {
    throw new Error(`[config] ${name} is required in production and must be at least 32 characters`);
  }
  // eslint-disable-next-line no-console
  console.warn(`[config] ${name} missing/weak — using an ephemeral dev secret. Set ${name} in .env.`);
  return `dev-only-${name}-${crypto.randomBytes(24).toString('hex')}`;
}

// Safe-pickup OTP mode. 'static' returns a fixed code and is dev/QA only: in
// production it is refused outright when explicitly set, and silently upgraded to
// 'random' when merely unset — so the fail-open case is the secure one.
function resolveOtpMode() {
  const raw = (process.env.SAFE_PICKUP_OTP_MODE || '').trim().toLowerCase();
  if (NODE_ENV === 'production') {
    if (raw === 'static') {
      throw new Error(
        '[config] SAFE_PICKUP_OTP_MODE=static is not allowed in production — it issues a ' +
          'fixed, publicly known pickup OTP. Set SAFE_PICKUP_OTP_MODE=random.'
      );
    }
    return 'random';
  }
  return raw === 'random' ? 'random' : 'static';
}

export const env = {
  nodeEnv: NODE_ENV,
  port: Number(process.env.PORT) || 5002,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_crm_platform',
  jwtSecret: requireSecret('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    // Required only for recurring subscriptions (webhook signature verification).
    // Missing in dev just disables webhook processing with a clear log line —
    // never a hardcoded fallback for something that authenticates money events.
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  firebase: {
    serviceAccountBase64: (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').replace(/\s/g, ''),
  },
  // Student Safe Pickup / Parent OTP verification.
  // Production always issues cryptographically random OTPs. 'static' mode exists
  // only so QA can exercise the pickup flow without an SMS provider, and a prod
  // deploy that merely forgot to set SAFE_PICKUP_OTP_MODE must never fall back to
  // a universally-known code for a child-handover control.
  safePickup: {
    otpMode: resolveOtpMode(),
    staticOtp: process.env.SAFE_PICKUP_STATIC_OTP || '123456',
    otpLength: Math.min(8, Math.max(4, Number(process.env.SAFE_PICKUP_OTP_LENGTH) || 6)),
    otpExpirySeconds: Number(process.env.SAFE_PICKUP_OTP_EXPIRY_SECONDS) || 300,
    maxAttempts: Number(process.env.SAFE_PICKUP_MAX_ATTEMPTS) || 5,
    resendCooldownSeconds: Number(process.env.SAFE_PICKUP_RESEND_COOLDOWN_SECONDS) || 30,
    maxResends: Number(process.env.SAFE_PICKUP_MAX_RESENDS) || 3,
  },
  smsProvider: (process.env.SMS_PROVIDER || 'mock').toLowerCase(),
};
