import { AppError } from '../../../shared/AppError.js';
import { verifyToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';

/**
 * Gate for the /uploads static mount.
 *
 * P0 fix: previously `express.static` served every uploaded document (student
 * Aadhaar/marksheets, employee documents, ID proofs, photos) to anyone on the
 * internet with no authentication and no school check.
 *
 * Now a valid platform JWT is required. The token is accepted from either the
 * `Authorization: Bearer` header (XHR / fetch) or a `?t=` query param, because
 * `<img>` / `<a download>` tags cannot send custom headers — the frontend
 * `assetUrl()` helper appends `?t=<token>`.
 *
 * NOTE (P1 follow-up): this authenticates the caller but does not yet verify
 * that the requested file belongs to the caller's school. Filenames are
 * non-enumerable in practice; per-record ownership checks + school-scoped
 * upload paths are the next hardening step.
 */
const ALLOWED_ROLES = new Set([
  'SCHOOLADMIN',
  'PRINCIPAL',
  'ACCOUNTANT',
  'HR',
  'LIBRARIAN',
  'TRANSPORT',
  'TEACHER',
  'SUPERADMIN',
]);

export function requireUploadAccess(req, res, next) {
  try {
    // Defense-in-depth: block traversal / hidden files even though express.static also guards.
    const decoded = decodeURIComponent(req.path || '');
    if (decoded.includes('..') || decoded.split('/').some((seg) => seg.startsWith('.'))) {
      throw new AppError('Not found', 404);
    }

    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
    const token = bearer || (typeof req.query.t === 'string' ? req.query.t : '');

    if (!token) {
      throw new AppError('Authentication required to access files', 401);
    }

    const payload = verifyToken(token, env.jwtSecret);
    const role = (payload.role || '').toUpperCase();
    if (!ALLOWED_ROLES.has(role)) {
      throw new AppError('Access denied', 403);
    }

    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError('Invalid or expired token', 401));
  }
}
