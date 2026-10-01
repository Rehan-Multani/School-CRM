import mongoose from 'mongoose';
import { PlatformNotification } from '../models/PlatformNotification.js';
import { DeviceToken } from '../models/DeviceToken.js';
import { School } from '../models/School.js';
import { Teacher } from '../models/Teacher.js';
import { Student } from '../models/Student.js';
import { Parent } from '../models/Parent.js';
import { ParentStudent } from '../models/ParentStudent.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { getFirebaseMessaging } from '../config/firebase.js';

/**
 * Event-driven push for the mobile apps (teacher / student / parent).
 *
 * Every event:
 *   1. writes ONE targeted PlatformNotification per role (recipientRefIds) so it
 *      shows up in that user's in-app notification list, with a deep `link`;
 *   2. sends an FCM push to those users' registered devices — skipping anyone
 *      who switched that category off in Notification settings;
 *   3. prunes device tokens FCM reports as dead.
 * It never throws into the caller: a push failure must not fail the request
 * that triggered it (callers fire-and-forget with `.catch(() => {})`).
 */
const MODEL_BY_ROLE = { teacher: Teacher, student: Student, parent: Parent };
const DEAD_TOKEN = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);
const oid = (v) => new mongoose.Types.ObjectId(String(v));

async function schoolSlug(schoolId) {
  const s = await School.findById(schoolId).select('schoolId').lean();
  return s?.schoolId || '';
}

/** Users of `role` among `ids` who have NOT turned off `pref`. */
async function optedIn(role, ids, pref) {
  const Model = MODEL_BY_ROLE[role];
  if (!Model || !ids.length) return [];
  const rows = await Model.find({ _id: { $in: ids.map(oid) } }).select('notificationPrefs').lean();
  return rows.filter((r) => !pref || r.notificationPrefs?.[pref] !== false).map((r) => String(r._id));
}

// Tests inject a fake messaging client; they must never reach real FCM.
let messagingOverride;
export function __setPushMessagingForTests(m) {
  messagingOverride = m;
}
function messagingClient() {
  if (messagingOverride !== undefined) return messagingOverride;
  return process.env.VITEST ? null : getFirebaseMessaging();
}

/** Raw FCM fan-out to device tokens; prunes the dead ones. Also used by appSession.service.js. */
export async function sendFcm(tokens, { title, body, data }) {
  const messaging = messagingClient();
  if (!messaging || !tokens.length) return { attempted: 0, success: 0, failed: 0, configured: Boolean(messaging) };
  let success = 0;
  let failed = 0;
  const dead = [];
  for (let i = 0; i < tokens.length; i += 500) {
    const group = tokens.slice(i, i + 500);
    const res = await messaging.sendEachForMulticast({
      tokens: group,
      notification: { title, body },
      data: Object.fromEntries(Object.entries({ ...data, title, body }).map(([k, v]) => [k, String(v ?? '')])),
      android: { priority: 'high', notification: { channelId: 'default', sound: 'default' } },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    success += res.successCount;
    failed += res.failureCount;
    res.responses.forEach((r, idx) => {
      if (!r.success && DEAD_TOKEN.has(r.error?.code || '')) dead.push(group[idx]);
    });
  }
  if (dead.length) await DeviceToken.deleteMany({ token: { $in: dead } });
  return { attempted: tokens.length, success, failed, configured: true };
}

/**
 * @param {{ schoolId, title, body, pref, link: {type,id}, recipients: { teacher?: string[], student?: string[], parent?: string[] } }} evt
 */
export async function notifyUsers({ schoolId, title, body, pref, link = {}, recipients = {} }) {
  try {
    const slug = await schoolSlug(schoolId);
    const out = {};
    for (const role of ['teacher', 'student', 'parent']) {
      const ids = [...new Set((recipients[role] || []).map(String))];
      if (!ids.length) continue;
      const notif = await PlatformNotification.create({
        title,
        body,
        audiences: [role],
        recipientRefIds: ids,
        schoolId: slug,
        createdBy: 'system',
        link: { type: link.type || '', id: link.id ? String(link.id) : '' },
      });
      const pushTo = await optedIn(role, ids, pref);
      const tokens = pushTo.length
        ? (await DeviceToken.find({ role, userId: { $in: pushTo } }).select('token').lean()).map((d) => d.token)
        : [];
      const delivery = await sendFcm(tokens, {
        title,
        body,
        data: { type: link.type || '', id: link.id || '', notificationId: String(notif._id), role },
      });
      notif.delivery = {
        firebaseConfigured: delivery.configured,
        attempted: delivery.attempted,
        success: delivery.success,
        failed: delivery.failed,
        skippedReason: tokens.length ? '' : 'No registered devices',
      };
      await notif.save();
      out[role] = { recipients: ids.length, pushed: delivery.success };
    }
    return out;
  } catch (err) {
    console.error('[push] event delivery failed:', err?.message || err);
    return { error: true };
  }
}

/** Active student ids of sections (+ their linked parents). */
export async function studentsOfSections(schoolId, sectionIds) {
  const rows = await StudentEnrollment.find({ schoolId: oid(schoolId), sectionId: { $in: sectionIds.map(oid) }, status: 'ACTIVE' })
    .select('studentId')
    .lean();
  return [...new Set(rows.map((r) => String(r.studentId)))];
}

export async function studentsOfClasses(schoolId, classIds) {
  const rows = await StudentEnrollment.find({ schoolId: oid(schoolId), classId: { $in: classIds.map(oid) }, status: 'ACTIVE' })
    .select('studentId')
    .lean();
  return [...new Set(rows.map((r) => String(r.studentId)))];
}

export async function parentsOf(schoolId, studentIds) {
  if (!studentIds.length) return [];
  const rows = await ParentStudent.find({ schoolId: oid(schoolId), studentId: { $in: studentIds.map(oid) }, status: 'ACTIVE' })
    .select('parentId')
    .lean();
  return [...new Set(rows.map((r) => String(r.parentId)))];
}

// ------------------------------------------------------------------ events
const fmtDay = (ymd) => {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const pushEvents = {
  async homeworkAssigned(schoolId, hw) {
    const students = await studentsOfSections(schoolId, [hw.sectionId]);
    return notifyUsers({
      schoolId,
      title: `New homework · ${hw.subjectName || 'Homework'}`,
      body: hw.title,
      pref: 'homework',
      link: { type: 'homework', id: hw.id || hw._id },
      recipients: { student: students, parent: await parentsOf(schoolId, students) },
    });
  },

  async assignmentPublished(schoolId, a) {
    const students = await studentsOfSections(schoolId, [a.sectionId]);
    return notifyUsers({
      schoolId,
      title: `New assignment · ${a.subjectName || 'Assignment'}`,
      body: a.title,
      pref: 'homework',
      link: { type: 'assignment', id: a.id || a._id },
      recipients: { student: students },
    });
  },

  /** `changes` = [{ studentId, status }] — only newly ABSENT / LATE students. */
  async attendanceFlagged(schoolId, date, changes) {
    const jobs = [];
    for (const status of ['ABSENT', 'LATE']) {
      const students = changes.filter((c) => c.status === status).map((c) => String(c.studentId));
      if (!students.length) continue;
      jobs.push(
        notifyUsers({
          schoolId,
          title: status === 'ABSENT' ? 'Marked absent' : 'Marked late',
          body: `Attendance for ${fmtDay(date)}: ${status === 'ABSENT' ? 'Absent' : 'Late'}.`,
          pref: 'attendance',
          link: { type: 'attendance', id: date },
          recipients: { student: students, parent: await parentsOf(schoolId, students) },
        })
      );
    }
    return Promise.all(jobs);
  },

  async leaveDecided(schoolId, leave) {
    const status = String(leave.status || '').toUpperCase();
    if (!['APPROVED', 'REJECTED'].includes(status)) return null;
    const type = String(leave.employeeType || '').toUpperCase();
    const role = type === 'TEACHER' ? 'teacher' : type === 'STUDENT' ? 'student' : null;
    const who = leave.employeeRefId || leave.studentId;
    if (!role || !who) return null;
    return notifyUsers({
      schoolId,
      title: `Leave ${status === 'APPROVED' ? 'approved' : 'rejected'}`,
      body: `${fmtDay(leave.startDate)} – ${fmtDay(leave.endDate)}${status === 'REJECTED' && leave.rejectionReason ? ` · ${leave.rejectionReason}` : ''}`,
      pref: 'leave',
      link: { type: 'leave', id: leave.id || leave._id },
      recipients: { [role]: [String(who)] },
    });
  },

  async resultPublished(schoolId, exam) {
    // classIds may arrive populated ({ _id, name }) from the exam repository.
    const students = await studentsOfClasses(schoolId, (exam.classIds || []).map((c) => String(c?._id || c?.id || c)));
    return notifyUsers({
      schoolId,
      title: 'Result published',
      body: `${exam.name} results are out.`,
      pref: 'result',
      link: { type: 'result', id: exam.id || exam._id },
      recipients: { student: students, parent: await parentsOf(schoolId, students) },
    });
  },
};
