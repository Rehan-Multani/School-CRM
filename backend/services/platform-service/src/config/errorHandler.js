import { env } from './env.js';

export function errorHandler(err, req, res, next) {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      message: 'File payload is too large. Please upload a smaller file.',
      code: 'LIMIT_FILE_SIZE',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const isProd = env.nodeEnv === 'production';
  const message = err.isOperational ? err.message : isProd ? 'Internal server error' : (err.message || 'Internal server error');
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');

  if (env.nodeEnv !== 'test') {
    console.error(`[Error] [${req.method} ${req.originalUrl}]:`, err.message || err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
  });
}
