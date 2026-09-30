import { School } from '../models/School.js';

// School._id -> School.schoolId (the lowercase slug PlatformNotification and
// DeviceToken are keyed by). The slug is set once when the school is created
// and never changes, so it is safe to keep for the life of the process; the
// APK inboxes read it on every notification call (incl. the 60s badge poll).
const slugs = new Map();

export async function schoolSlugOf(schoolId) {
  const key = String(schoolId || '');
  if (!key) return '';
  if (slugs.has(key)) return slugs.get(key);
  const school = await School.findById(key).select('schoolId').lean();
  const slug = school?.schoolId || '';
  if (slug) slugs.set(key, slug);
  return slug;
}
