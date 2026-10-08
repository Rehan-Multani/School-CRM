import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
// A test run must never send a real SMS, whatever .env says. (vitest sets VITEST.)
const UNDER_TEST_RUNNER = Boolean(process.env.VITEST);
// ...and the suite must not depend on how .env is set for real SMS either: tests
// use the fixed OTP modes, so a developer's live .env (random OTPs) cannot break them.

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
  if (UNDER_TEST_RUNNER && NODE_ENV !== 'production') return 'static';
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
  loginOtp: {
    otpMode: UNDER_TEST_RUNNER ? 'static' : (process.env.LOGIN_OTP_MODE || (NODE_ENV === 'production' ? 'random' : 'static')).toLowerCase(),
    staticOtp: process.env.LOGIN_STATIC_OTP || '123456',
    // Demo accounts: ONLY these exact mobile numbers sign in with the fixed
    // `demoOtp` (no SMS is sent); every other number gets a random OTP by SMS.
    // Empty by default = feature off. e.g. LOGIN_DEMO_NUMBERS=9000011111
    demoNumbers: UNDER_TEST_RUNNER
      ? []
      : String(process.env.LOGIN_DEMO_NUMBERS || '')
          .split(',')
          .map((n) => n.replace(/\D/g, '').slice(-10))
          .filter((n) => n.length === 10),
    demoOtp: String(process.env.LOGIN_DEMO_OTP || '123456'),
  },
  smsProvider: UNDER_TEST_RUNNER ? 'mock' : (process.env.SMS_PROVIDER || 'mock').toLowerCase(),
  // Real SMS delivery (SMS_PROVIDER=smsgatewayhub). India DLT: the sender header,
  // the principal-entity (PE) id and a registered template id are mandatory, and
  // the text must match the registered template — see sms.service.js.
  sms: {
    apiKey: UNDER_TEST_RUNNER ? '' : process.env.SMS_API_KEY || '',
    senderId: process.env.SMS_SENDER_ID || '',
    entityId: process.env.SMS_ENTITY_ID || '',
    route: process.env.SMS_ROUTE || '',
    // SMSIndiaHub and SMSGatewayHub run the same HTTP API on different hosts.
    baseUrl:
      process.env.SMS_BASE_URL ||
      ((process.env.SMS_PROVIDER || '').toLowerCase() === 'smsgatewayhub'
        ? 'https://www.smsgatewayhub.com/api/mt/SendSMS'
        : 'https://cloud.smsindiahub.in/api/mt/SendSMS'),
    timeoutMs: Number(process.env.SMS_TIMEOUT_MS) || 10000,
    // Values for the {#var#} slots of "Welcome to {app}, powered by {powered}…".
    appName: process.env.SMS_APP_NAME || 'School Sarthi',
    poweredBy: process.env.SMS_POWERED_BY || 'School Sarthi',
    // Registered DLT templates. `text` uses {app} {powered} {otp} (and {student}
    // for a pickup template) where the registered text has {#var#}.
    templates: {
      LOGIN_OTP: {
        id: process.env.SMS_TEMPLATE_ID_LOGIN || '',
        text:
          process.env.SMS_TEMPLATE_TEXT_LOGIN ||
          'Welcome to {app}, powered by {powered}. Your OTP for registration {otp}. This OTP is valid for 10 minutes. Please do not share it with anyone.BGADPL',
      },
      PASSWORD_RESET_OTP: {
        id: process.env.SMS_TEMPLATE_ID_PASSWORD_RESET || '',
        text: process.env.SMS_TEMPLATE_TEXT_PASSWORD_RESET || '',
      },
      SAFE_PICKUP_OTP: {
        id: process.env.SMS_TEMPLATE_ID_SAFE_PICKUP || '',
        text: process.env.SMS_TEMPLATE_TEXT_SAFE_PICKUP || '',
      },
    },
  },
};
