import { AppError } from '../../../shared/AppError.js';

/**
 * The one mobile-number rule for the whole platform: exactly 10 digits, and an
 * Indian mobile series (6-9) — the same rule the school-onboarding form has
 * always applied, now shared so students, staff, wardens, drivers and guardians
 * cannot be saved with a 17-digit number.
 *
 * Two output shapes, one rule:
 *  - `normalizeMobile`       → bare digits, "9876543210" (students, staff,
 *                              wardens, drivers, parents — the common case)
 *  - `normalizeIndianMobile` → "+919876543210" (School.contact / School.admin,
 *                              which have stored the +91 form since day one)
 */

export const MOBILE_LENGTH = 10;
export const MOBILE_RE = /^[6-9]\d{9}$/;

/**
 * Everything a human might type — "+91 98765 43210", "098765-43210",
 * "919876543210" — reduced to the 10 digits that identify the phone. Returns
 * '' when there is nothing to work with; it validates nothing on its own.
 */
export function toMobileDigits(value) {
  const text = typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
  let digits = text.replace(/\D/g, '');
  // Country code and trunk prefix are not part of the number itself.
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

const badMobile = (label) =>
  new AppError(`${label} must be a valid 10-digit mobile number`, 400, 'INVALID_MOBILE');

/**
 * Bare 10 digits, or a 400. An optional field (`required: false`) accepts a
 * blank value and returns '' — but anything actually typed must still be a real
 * number, so a half-entered one is never quietly stored.
 */
export function normalizeMobile(value, label = 'Mobile number', { required = true } = {}) {
  const digits = toMobileDigits(value);
  if (!digits) {
    if (required) throw new AppError(`${label} is required`, 400, 'INVALID_MOBILE');
    return '';
  }
  if (!MOBILE_RE.test(digits)) throw badMobile(label);
  return digits;
}

/** Same rule, stored with the country code: "+919876543210". */
export function normalizeIndianMobile(value, label = 'Mobile number', required = true) {
  const digits = normalizeMobile(value, label, { required });
  return digits ? `+91${digits}` : '';
}

/**
 * Every shape the same 10-digit number may have been stored in before
 * `normalizeMobile` was applied everywhere — for `$in` lookups by mobile.
 */
export function mobileVariants(value) {
  const digits = toMobileDigits(value);
  return digits ? [digits, `+91${digits}`, `91${digits}`, `0${digits}`] : [];
}

/** True/false form for callers that report their own errors. */
export function isValidMobile(value) {
  return MOBILE_RE.test(toMobileDigits(value));
}
