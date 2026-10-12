import { AppError } from '../../../shared/AppError.js';

/**
 * Date of birth for a NEW student / teacher / staff record. It is required (the
 * daily birthday wish is driven by it) and cannot be in the future. Returns a
 * Date at UTC midnight so month/day never shift with the server timezone.
 */
export function requireBirthDate(value, label = 'Date of birth') {
  const raw = value instanceof Date ? value.toISOString() : String(value ?? '').trim();
  if (!raw) throw new AppError(`${label} is required`, 400, 'VALIDATION_ERROR');
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new AppError(`${label} is not a valid date`, 400, 'VALIDATION_ERROR');
  if (d.getTime() > Date.now()) throw new AppError(`${label} cannot be in the future`, 400, 'VALIDATION_ERROR');
  if (d.getUTCFullYear() < 1900) throw new AppError(`${label} is not a valid date`, 400, 'VALIDATION_ERROR');
  return d;
}
