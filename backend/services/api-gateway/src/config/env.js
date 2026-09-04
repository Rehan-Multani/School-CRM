import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  // Comma-separated allowlist. Anything not listed is rejected (no wildcard).
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:5001',
  platformServiceUrl: process.env.PLATFORM_SERVICE_URL || 'http://localhost:5002',
};
