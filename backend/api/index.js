import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load routes
import authRoutes from '../services/auth-service/src/routes/authRoutes.js';
import platformRoutes from '../services/platform-service/src/routes/platformRoutes.js';
import { ensureUploadDirs, uploadsRoot } from '../services/platform-service/src/utils/upload.utils.js';
import { brandAssetLinks } from '../services/platform-service/src/middleware/brandAssetLinks.js';
import { errorHandler as authErrorHandler } from '../services/auth-service/src/config/errorHandler.js';
import { errorHandler as platformErrorHandler } from '../services/platform-service/src/config/errorHandler.js';

dotenv.config();

const app = express();

// Behind nginx / Passenger: trust one proxy hop so req.ip and the rate limiters
// use the real client IP from X-Forwarded-For (same as the service apps).
app.set('trust proxy', 1);

// Ensure upload folders exist (in /tmp/uploads for Vercel)
ensureUploadDirs();

// Middlewares
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.startsWith('http://localhost:') || 
      origin.endsWith('.vercel.app') || 
      origin.endsWith('.schoolsarthiapp.com') ||
      origin === 'https://schoolsarthiapp.com' ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan('combined'));
app.use(compression());
app.use(express.json({ limit: '5mb' }));

// Static route for uploads (ephemeral in Vercel /tmp)
app.use('/uploads', express.static(uploadsRoot));

// Mongoose Connection Cache
let cachedConnection = null;

async function connectDB() {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }
  
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/school_crm_platform';
  mongoose.set('strictQuery', true);
  
  try {
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10, // low for serverless environments
      serverSelectionTimeoutMS: 5000,
    });
    cachedConnection = conn;
    console.log('MongoDB connected successfully');
    return conn;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
}

// Health & Availability Checks
app.get(['/', '/health', '/api', '/api/health'], async (req, res) => {
  let dbError = null;
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (err) {
      // The driver's message names the cluster hosts — server log only.
      dbError = err.name || 'DatabaseError';
    }
  }
  const isConnected = mongoose.connection.readyState === 1;

  // Public endpoint: never the connection string, user or host names.
  res.json({
    success: true,
    service: 'api-gateway-cpanel',
    status: isConnected ? 'HEALTHY' : 'DEGRADED',
    database: isConnected ? 'CONNECTED' : 'DISCONNECTED',
    ...(dbError ? { error: dbError } : {}),
    timestamp: new Date().toISOString(),
  });
});

app.get(['/ready', '/api/ready'], (req, res) => {
  res.json({
    success: true,
    status: 'READY',
    timestamp: new Date().toISOString(),
  });
});

// Database Connection Middleware for API routes
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    // 503 = temporary: the apps show "server not reachable" and retry reads.
    // The reason is already in the server log (connectDB) — not for clients.
    res.status(503).json({
      success: false,
      message: 'The service is temporarily unavailable. Please try again in a moment.',
      code: 'SERVICE_UNAVAILABLE',
    });
  }
});

// Mobile app: school logo as a cacheable link instead of an inline data URI
app.use(brandAssetLinks);

// Routes (Support both /api/v1 and /v1 prefixes for cPanel sub-path /api or root)
app.use(['/api/v1/platform/auth', '/v1/platform/auth'], authRoutes);
app.use(['/api/v1/platform', '/v1/platform'], platformRoutes);

// Error handlers
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(authErrorHandler);
app.use(platformErrorHandler);

export default app;
