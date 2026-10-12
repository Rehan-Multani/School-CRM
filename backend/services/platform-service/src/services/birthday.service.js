import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { School } from '../models/School.js';
import { DeviceToken } from '../models/DeviceToken.js';
import { PlatformNotification } from '../models/PlatformNotification.js';
import { sendFcm } from './pushEvents.service.js';

/**
 * Birthday wishes: every morning (IST) each ACTIVE student, teacher and staff
 * member whose date of birth falls on today gets
 *   - an in-app notification (their notification list in the app / web panel), and
 *   - a push to every device they are signed in on (mobile app AND web browser —
 *     both register their FCM token in DeviceToken under the person's role + id).
 * Safe to run more than once a day: a person already wished today is skipped.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const STAFF_DEVICE_ROLE = {
  PRINCIPAL: 'principal',
  HR: 'hr',
  ACCOUNTANT: 'accountant',
  LIBRARIAN: 'librarian',
  TRANSPORT: 'transport',
  TEACHER: 'teacher',
};

/** Today's calendar date in IST, plus the instant IST midnight started. */
function istToday(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const month = ist.getUTCMonth() + 1;
  const day = ist.getUTCDate();
  const startUtc = new Date(Date.UTC(y, month - 1, day) - IST_OFFSET_MS);
  return { year: y, month, day, startUtc };
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** [month, day] pairs whose birthday is celebrated today (29 Feb on 28 Feb in common years). */
function todaysMonthDays({ year, month, day }) {
  const out = [[month, day]];
  if (month === 2 && day === 28 && !isLeap(year)) out.push([2, 29]);
  return out;
}

function birthdayFilter(pairs) {
  return {
    status: 'ACTIVE',
    dateOfBirth: { $ne: null },
    $expr: {
      $or: pairs.map(([m, d]) => ({
        $and: [{ $eq: [{ $month: '$dateOfBirth' }, m] }, { $eq: [{ $dayOfMonth: '$dateOfBirth' }, d] }],
      })),
    },
  };
}

const firstNameOf = (full) => String(full || '').trim().split(/\s+/)[0] || '';

async function peopleWithBirthday(pairs) {
  const filter = birthdayFilter(pairs);
  const [students, teachers, staff] = await Promise.all([
    Student.find(filter).select('schoolId firstName lastName').lean(),
    Teacher.find(filter).select('schoolId name firstName').lean(),
    SchoolUser.find(filter).select('schoolId name firstName role').lean(),
  ]);
  return [
    ...students.map((s) => ({ id: String(s._id), schoolId: String(s.schoolId), role: 'student', name: s.firstName || '' })),
    ...teachers.map((t) => ({ id: String(t._id), schoolId: String(t.schoolId), role: 'teacher', name: t.firstName || firstNameOf(t.name) })),
    ...staff
      .map((u) => ({
        id: String(u._id),
        schoolId: String(u.schoolId),
        role: STAFF_DEVICE_ROLE[String(u.role || '').toUpperCase()] || '',
        name: u.firstName || firstNameOf(u.name),
      }))
      .filter((p) => p.role),
  ];
}

class BirthdayService {
  /** @returns {{ checked: number, sent: number, skipped: number }} */
  async runForToday(now = new Date()) {
    const today = istToday(now);
    const people = await peopleWithBirthday(todaysMonthDays(today));
    if (!people.length) return { checked: 0, sent: 0, skipped: 0 };

    // Already wished today (this run may be a retry / hourly catch-up).
    const done = new Set(
      (
        await PlatformNotification.find({
          'link.type': 'birthday',
          createdAt: { $gte: today.startUtc },
          recipientRefIds: { $in: people.map((p) => p.id) },
        })
          .select('recipientRefIds')
          .lean()
      ).flatMap((n) => n.recipientRefIds.map(String))
    );

    const schools = new Map();
    const schoolOf = async (id) => {
      if (!schools.has(id)) {
        const s = await School.findById(id).select('schoolId name').lean();
        schools.set(id, s ? { slug: s.schoolId || '', name: s.name || 'your school' } : null);
      }
      return schools.get(id);
    };

    let sent = 0;
    let skipped = 0;
    for (const p of people) {
      if (done.has(p.id)) {
        skipped += 1;
        continue;
      }
      try {
        const school = await schoolOf(p.schoolId);
        if (!school) {
          skipped += 1;
          continue;
        }
        const title = `Happy Birthday${p.name ? `, ${p.name}` : ''}! 🎂`;
        const body = `Wishing you a wonderful year ahead. Warm wishes from ${school.name}.`;
        const notif = await PlatformNotification.create({
          title,
          body,
          audiences: [p.role],
          recipientRefIds: [p.id],
          schoolId: school.slug,
          schoolName: school.name,
          createdBy: 'system',
          link: { type: 'birthday', id: '' },
        });
        const tokens = (await DeviceToken.find({ role: p.role, userId: p.id }).select('token').lean()).map((d) => d.token);
        const delivery = await sendFcm(tokens, {
          title,
          body,
          data: { type: 'birthday', id: '', notificationId: String(notif._id), role: p.role },
        });
        notif.delivery = {
          firebaseConfigured: delivery.configured,
          attempted: delivery.attempted,
          success: delivery.success,
          failed: delivery.failed,
          skippedReason: tokens.length ? '' : 'No registered devices',
        };
        await notif.save();
        sent += 1;
      } catch (err) {
        skipped += 1;
        // eslint-disable-next-line no-console
        console.error('[birthday] failed for one person:', err?.message || err);
      }
    }
    return { checked: people.length, sent, skipped };
  }
}

export const birthdayService = new BirthdayService();
export { istToday as __istToday, todaysMonthDays as __todaysMonthDays };
