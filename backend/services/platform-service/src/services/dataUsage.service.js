import mongoose from 'mongoose';
import { schoolTargets } from './backup.service.js';
import { platformSettingService } from './platformSetting.service.js';

/**
 * How much data one school has stored (every collection that carries its
 * schoolId — students, staff, attendance, fees, ...), and the gentle
 * "please clean up old records" notice shown on the School Admin / Principal
 * dashboard once that size crosses the Super Admin's threshold.
 *
 * The notice is deliberately worded as a performance tip. It never mentions a
 * limit, a plan or an upgrade, and it never carries the numbers.
 *
 * Measuring walks ~90 collections, so the result is cached per school.
 */

const CACHE_MS = 15 * 60 * 1000;
const cache = new Map(); // schoolId -> { at, bytes }
const inFlight = new Map(); // schoolId -> Promise<number>

async function measureBytes(schoolId) {
  const targets = schoolTargets(schoolId);
  const sizes = await Promise.all(
    targets.map(async ({ coll, filter }) => {
      try {
        const [row] = await coll
          .aggregate([{ $match: filter }, { $group: { _id: null, bytes: { $sum: { $bsonSize: '$$ROOT' } } } }])
          .toArray();
        return row?.bytes || 0;
      } catch {
        return 0; // one unreadable collection must not hide the rest
      }
    })
  );
  return sizes.reduce((sum, n) => sum + n, 0);
}

export async function getSchoolDataBytes(schoolId) {
  const key = String(schoolId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.bytes;
  if (inFlight.has(key)) return inFlight.get(key);

  const job = measureBytes(key)
    .then((bytes) => {
      cache.set(key, { at: Date.now(), bytes });
      return bytes;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, job);
  return job;
}

export function clearDataUsageCache() {
  cache.clear();
}

const NOTICE = {
  title: 'Keep your portal fast',
  message:
    'A lot of records have built up in your school account over time. For smoother and faster performance, ' +
    'please review and delete old data you no longer need - such as past attendance, outdated enquiries, ' +
    'visitor logs, old notices and unused records.',
};

/** `{ show: false }` or `{ show: true, title, message }` for the dashboard. */
export async function getDataNotice(schoolId) {
  if (!mongoose.isValidObjectId(schoolId)) return { show: false };
  const limitMb = await platformSettingService.getDataWarningMb();
  if (!limitMb) return { show: false };
  const bytes = await getSchoolDataBytes(schoolId);
  if (bytes / (1024 * 1024) < limitMb) return { show: false };
  return { show: true, ...NOTICE };
}
