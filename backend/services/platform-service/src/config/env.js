import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const platformRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.resolve(platformRoot, '.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5002,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_crm_platform',
  jwtSecret: process.env.JWT_SECRET || 'f9c6d78859c86afd4b4bf312d0238145e14e726bde1c62bbbc2728d485f6a11276ad67829a8edef358f96c0f4dd70704342cd10340dc541441e48f0ab2e9949d',
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
  },
  firebase: {
    serviceAccountBase64: (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').replace(/\s/g, ''),
  },
};
