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
};
