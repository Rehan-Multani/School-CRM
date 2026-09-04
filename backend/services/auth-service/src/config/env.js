import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';

// P1: no hardcoded secret fallbacks. Require strong secrets; dev may use an
// ephemeral per-process value (loud warning) so a forgotten .env fails safe
// instead of silently running on a public secret.
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

function requiredSuperAdminPassword() {
  const value = (process.env.SUPERADMIN_PASSWORD || '').trim();
  if (value) return value;
  if (NODE_ENV === 'production') {
    throw new Error('[config] SUPERADMIN_PASSWORD is required in production');
  }
  // eslint-disable-next-line no-console
  console.warn('[config] SUPERADMIN_PASSWORD not set — using a random dev password (check server logs on first seed).');
  return `dev-${crypto.randomBytes(9).toString('base64url')}`;
}

export const env = {
  nodeEnv: NODE_ENV,
  port: Number(process.env.PORT) || 5001,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_crm_platform',
  jwtSecret: requireSecret('JWT_SECRET'),
  jwtRefreshSecret: requireSecret('JWT_REFRESH_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  superAdmin: {
    email: (process.env.SUPERADMIN_EMAIL || 'superadmin@gmail.com').toLowerCase().trim(),
    password: requiredSuperAdminPassword(),
    name: process.env.SUPERADMIN_NAME || 'Super Admin',
  },
};
