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

/**
 * Teacher identity from the verified JWT (never from the request body).
 * The teacher token carries both `teacherId` and `sub` set to Teacher._id.
 * Throws fail-closed when the session has no usable teacher context.
 */
export function teacherId(req) {
  const raw = req.user?.teacherId || req.user?.sub;
  if (!raw || !mongoose.isValidObjectId(String(raw))) {
    throw new AppError('Teacher context is missing or invalid on this session', 401);
  }
  return String(raw);
}

/**
 * Student identity from the verified JWT (never from the request body/query).
 * The student token carries both `studentId` and `sub` set to Student._id.
 * Throws fail-closed when the session has no usable student context.
 */
export function studentId(req) {
  const raw = req.user?.studentId || req.user?.sub;
  if (!raw || !mongoose.isValidObjectId(String(raw))) {
    throw new AppError('Student context is missing or invalid on this session', 401);
  }
  return String(raw);
}

/**
 * Parent identity from the verified JWT (never from the request body/query).
 * The parent token carries both `parentId` and `sub` set to Parent._id.
 * Throws fail-closed when the session has no usable parent context.
 */
export function parentId(req) {
  const raw = req.user?.parentId || req.user?.sub;
  if (!raw || !mongoose.isValidObjectId(String(raw))) {
    throw new AppError('Parent context is missing or invalid on this session', 401);
  }
  return String(raw);
}

/**
 * Driver identity from the verified JWT (never from the request body/query).
 * The driver token carries both `driverId` and `sub` set to Driver._id.
 */
export function driverId(req) {
  const raw = req.user?.driverId || req.user?.sub;
  if (!raw || !mongoose.isValidObjectId(String(raw))) {
    throw new AppError('Driver context is missing or invalid on this session', 401);
  }
  return String(raw);
}
