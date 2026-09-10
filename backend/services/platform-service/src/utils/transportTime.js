import { AppError } from '../../../shared/AppError.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const TWELVE_HOUR = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*([AaPp])\.?[Mm]\.?$/;
const TWENTY_FOUR_HOUR = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/**
 * Accepts "7:30 AM", "07:30 am", "7:30am" or 24-hour "07:30" / "16:00" and
 * returns the canonical stored form: "07:30 AM". Anything else is a 400 rather
 * than a silently-stored junk string, because these times are what a student's
 * whole schedule is read from.
 */
export function normalizeTime(value, label) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    throw new AppError(`${label} is required`, 400, TRANSPORT_ERR.VALIDATION_ERROR);
  }

  const twelve = raw.match(TWELVE_HOUR);
  if (twelve) {
    const hour = Number(twelve[1]);
    const meridiem = twelve[3].toUpperCase() === 'A' ? 'AM' : 'PM';
    return `${String(hour).padStart(2, '0')}:${twelve[2]} ${meridiem}`;
  }

  const twentyFour = raw.match(TWENTY_FOUR_HOUR);
  if (twentyFour) {
    const hour24 = Number(twentyFour[1]);
    const meridiem = hour24 < 12 ? 'AM' : 'PM';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return `${String(hour12).padStart(2, '0')}:${twentyFour[2]} ${meridiem}`;
  }

  throw new AppError(
    `${label} must look like "07:30 AM" (or 24-hour "07:30")`,
    400,
    TRANSPORT_ERR.VALIDATION_ERROR
  );
}

/** Today as YYYY-MM-DD. */
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/** Validate an inbound YYYY-MM-DD, defaulting to today when omitted. */
export function normalizeDate(value) {
  if (value === undefined || value === null || value === '') return todayStr();
  const raw = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) {
    throw new AppError('date must be in YYYY-MM-DD format', 400, TRANSPORT_ERR.VALIDATION_ERROR);
  }
  return raw;
}
