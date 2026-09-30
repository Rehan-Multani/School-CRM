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

  // Mongoose/Mongo internals must never reach a client (they name collections,
  // fields and index keys). Map the two a client can cause to clean 4xx; every
  // other non-operational error is a generic 500 — the detail stays in the log.
  const known = err?.name === 'CastError' || err?.name === 'BSONError'
    ? { statusCode: 400, message: 'Invalid identifier in request', code: 'INVALID_ID' }
    : err?.code === 11000
      ? { statusCode: 409, message: 'This record already exists', code: 'DUPLICATE' }
      : null;
  const statusCode = known?.statusCode || err.statusCode || 500;
  // `expose` = http-errors' own "safe for clients" flag (body-parser 400/413).
  const safe = err.isOperational || (err.expose === true && statusCode < 500);
  const message = known?.message || (safe ? err.message : 'Internal server error');
  const code = known?.code || (typeof err.code === 'string' ? err.code : null) || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 401 ? 'UNAUTHORIZED' : statusCode === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');

  if (env.nodeEnv !== 'test') {
    // Log a string only (no full error object / stack) + correlation id.
    const detail = err?.message || err?.name || 'Unknown error';
    console.error(`[Error] ${statusCode} [${req.method} ${req.originalUrl}] rid=${req.id || '-'}: ${detail}`);
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
