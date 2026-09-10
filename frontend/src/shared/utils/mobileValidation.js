/**
 * Shared Mobile / Phone Validation Utilities for 10-digit Numbers
 */

export const MOBILE_MAX_LENGTH = 10;
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

/**
 * Strips all non-digit characters and limits length to 10 digits.
 */
export function sanitizeMobileInput(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 10);
}

/**
 * Validates whether the given value is an exact 10-digit number.
 * If required is false and value is empty, returns true.
 */
export function isValid10DigitMobile(value, required = true) {
  const digits = sanitizeMobileInput(value);
  if (!digits) return !required;
  return digits.length === 10;
}

/**
 * Returns an error message if invalid, or empty string if valid.
 */
export function getMobileValidationError(value, label = 'Mobile number', required = true) {
  const digits = sanitizeMobileInput(value);
  if (!digits) {
    return required ? `${label} is required` : '';
  }
  if (digits.length !== 10) {
    return `${label} must be exactly 10 digits`;
  }
  return '';
}

