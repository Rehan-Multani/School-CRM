import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';

/**
 * Canonical tenant resolver.
 *
 * The school a request operates on is ALWAYS derived from the verified JWT,
 * never from req.body / req.query / req.params. For a SchoolAdmin token the
 * school _id is in `sub`; for staff tokens it is in `schoolId`.
 *
 * Throws (fail-closed, explicit) when the token carries no usable school
 * context instead of silently falling back to an id that matches nothing.
 */
export function schoolId(req) {
  const role = (req.user?.role || '').toUpperCase();
  const raw = role === 'SCHOOLADMIN' ? req.user?.sub : req.user?.schoolId;

  if (!raw || !mongoose.isValidObjectId(String(raw))) {
    throw new AppError('School context is missing or invalid on this session', 401);
  }
  return String(raw);
}

export function performedBy(req) {
  return req.user?.name || req.user?.email || 'System';
}
