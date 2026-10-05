import { AppError } from '../../../shared/AppError.js';
import { SchoolUser } from '../models/SchoolUser.js';

/**
 * Staff tokens (Principal, HR, Accountant, Librarian) live for days, so a valid
 * signature alone is not enough: a staff member who has been deleted or
 * deactivated must lose access at once, not when the token expires. Every
 * staff role guard calls this after verifying the token.
 *
 * The School Admin's token is the school's own login, not a SchoolUser, and is
 * not checked here.
 *
 * The answer is cached per account for a few seconds so a page that fires ten
 * requests costs one lookup; deleting or changing a user clears their entry.
 */
const TTL_MS = 15_000;
const cache = new Map(); // userId -> { at, promise<boolean> }

export function clearStaffAccountCache(userId) {
  if (userId) cache.delete(String(userId));
  else cache.clear();
}

async function isActive(userId, schoolId) {
  const user = await SchoolUser.findById(userId).select('status schoolId').lean();
  if (!user || user.status !== 'ACTIVE') return false;
  // The token's school must still be the account's school.
  return !schoolId || String(user.schoolId) === String(schoolId);
}

export async function assertStaffAccountActive(payload) {
  if ((payload?.role || '').toUpperCase() === 'SCHOOLADMIN') return;
  const userId = String(payload?.userId || payload?.sub || '');
  if (!userId) throw new AppError('Session expired, please log in again', 401);

  let hit = cache.get(userId);
  if (!hit || Date.now() - hit.at >= TTL_MS) {
    hit = { at: Date.now(), promise: isActive(userId, payload.schoolId) };
    cache.set(userId, hit);
    hit.promise.catch(() => cache.delete(userId));
  }
  if (!(await hit.promise)) {
    cache.delete(userId);
    throw new AppError('This account is no longer active. Please contact your school administrator.', 401);
  }
}
