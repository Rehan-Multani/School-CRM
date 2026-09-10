/**
 * Stable machine-readable error codes for the Hostel module. errorHandler.js
 * surfaces `err.code` in the JSON body, so the frontend can branch on these
 * instead of matching on message text.
 */
export const HOSTEL_ERR = {
  VALIDATION_ERROR: 'HOSTEL_VALIDATION_ERROR',
  NOT_FOUND: 'HOSTEL_NOT_FOUND',
  DUPLICATE: 'HOSTEL_DUPLICATE',
  IN_USE: 'HOSTEL_IN_USE',
  HOSTEL_INACTIVE: 'HOSTEL_INACTIVE',
  WARDEN_INACTIVE: 'HOSTEL_WARDEN_INACTIVE',
  ALREADY_ASSIGNED: 'HOSTEL_ALREADY_ASSIGNED',
  BED_OCCUPIED: 'HOSTEL_BED_OCCUPIED',
  CAPACITY_FULL: 'HOSTEL_CAPACITY_FULL',
  NOT_READY: 'HOSTEL_NOT_READY',
  UNAUTHORIZED: 'HOSTEL_UNAUTHORIZED',
};
