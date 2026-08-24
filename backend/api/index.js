import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load routes
import authRoutes from '../services/auth-service/src/routes/authRoutes.js';
import platformRoutes from '../services/platform-service/src/routes/platformRoutes.js';
import { ensureUploadDirs, uploadsRoot } from '../services/platform-service/src/utils/upload.utils.js';
import { errorHandler as authErrorHandler } from '../services/auth-service/src/config/errorHandler.js';
import { errorHandler as platformErrorHandler } from '../services/platform-service/src/config/errorHandler.js';

dotenv.config();

const app = express();

// Ensure upload folders exist (in /tmp/uploads for Vercel)
ensureUploadDirs();

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan('combined'));
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

// Database Connection Middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// Health Checks
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'api-gateway-vercel',
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  res.json({
    success: true,
    status: 'READY',
    timestamp: new Date().toISOString(),
  });
});

// Routes
// Note: Vercel maps request URLs as-is, and Express matching handles prefixes automatically
app.use('/api/v1/platform/auth', authRoutes);
app.use('/api/v1/platform', platformRoutes);

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
