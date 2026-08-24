import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5001,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_crm_platform',
  jwtSecret: process.env.JWT_SECRET || 'f9c6d78859c86afd4b4bf312d0238145e14e726bde1c62bbbc2728d485f6a11276ad67829a8edef358f96c0f4dd70704342cd10340dc541441e48f0ab2e9949d',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '152cfa7a370937ba23c352c67703f4da8904b5b12a9c81c18924e19e2eea169f05d2c0e32807c8aadff4aebb4c096de855faee32fde740bd096b3baaa21d9643',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  superAdmin: {
    email: (process.env.SUPERADMIN_EMAIL || 'superadmin@gmail.com').toLowerCase().trim(),
    password: process.env.SUPERADMIN_PASSWORD || '123',
    name: process.env.SUPERADMIN_NAME || 'Super Admin',
  },
};
