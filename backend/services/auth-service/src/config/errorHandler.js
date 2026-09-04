import { env } from './env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND',
  });
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProd = env.nodeEnv === 'production';
  const message = err.isOperational ? err.message : isProd ? 'Internal server error' : (err.message || 'Internal server error');
  const code = err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');

  if (env.nodeEnv !== 'test') {
    const detail = err?.message || err?.name || 'Unknown error';
    console.error(`[Auth Error] ${statusCode} [${req.method} ${req.originalUrl}]: ${detail}`);
    if (!err?.isOperational && statusCode >= 500 && env.nodeEnv !== 'production') {
      console.error(err?.stack || err);
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
  });
}
