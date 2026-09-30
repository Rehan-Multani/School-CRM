/**
 * Event-driven push (FCM) for the mobile apps, with a fake messaging client —
 * nothing reaches real Firebase. Checks who gets an in-app notification, who
 * gets a push, notification-settings opt-out, de-dup, deep links and dead-token
 * pruning.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let calls = [];
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const ymd = (days = 0) => {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fakeMessaging = {
  async sendEachForMulticast({ tokens, data, notification }) {
    calls.push({ tokens, data, notification });
    const responses = tokens.map((t) =>
      t.startsWith('dead-') ? { success: false, error: { code: 'messaging/registration-token-not-registered' } } : { success: true }
    );
    return { successCount: responses.filter((r) => r.success).length, failureCount: responses.filter((r) => !r.success).length, responses };
  },
};
async function waitForCalls(n = 1, ms = 3000) {
  const end = Date.now() + ms;
  while (calls.length < n && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  await new Promise((r) => setTimeout(r, 60)); // let the bookkeeping save finish
}
const allTokens = () => calls.flatMap((c) => c.tokens);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  const { __setPushMessagingForTests } = await import('../src/services/pushEvents.service.js');
  __setPushMessagingForTests(fakeMessaging);
  // Devices: student + parent of school A (Sam), and a dead token for the other student.
  await request(app).post('/school-portal/student/device-tokens').set(auth(ctx.a.studentToken)).send({ token: 'student-sam-device-token-000000000001' });
  await request(app).post('/school-portal/parent/device-tokens').set(auth(ctx.a.parentToken)).send({ token: 'parent-pat-device-token-000000000001' });
  const { DeviceToken } = await import('../src/models/DeviceToken.js');
  await DeviceToken.create({ token: 'dead-nomo-device-token-00000000001', role: 'student', schoolId: 'schoola', userId: ctx.a.studentNoGuardianId });
}, 60000);
afterAll(async () => {
  const { __setPushMessagingForTests } = await import('../src/services/pushEvents.service.js');
  __setPushMessagingForTests(undefined);
  await disconnect();
});
beforeEach(() => {
  calls = [];
});

describe('Push on teacher actions', () => {
  it('new homework → in-app notification (with deep link) + push to students and parents of that section; dead token pruned', async () => {
    const res = await request(app).post('/school-portal/teacher/homework').set(auth(ctx.a.token))
      .send({ title: 'Read chapter 5', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, assignedDate: ymd(), dueDate: ymd(2) });
    expect(res.status).toBeLessThan(300);
    await waitForCalls(2);
    const tokens = allTokens();
    expect(tokens).toEqual(expect.arrayContaining(['student-sam-device-token-000000000001', 'parent-pat-device-token-000000000001']));
    const studentCall = calls.find((c) => c.data.role === 'student');
    expect(studentCall.data).toMatchObject({ type: 'homework', id: res.body.data.id });
    expect(studentCall.notification.title).toMatch(/homework/i);

    const { DeviceToken } = await import('../src/models/DeviceToken.js');
    expect(await DeviceToken.exists({ token: 'dead-nomo-device-token-00000000001' })).toBeFalsy();

    // shows in the student's own notification list, with the link the app opens
    const inbox = await request(app).get('/school-portal/student/notifications').set(auth(ctx.a.studentToken));
    const n = inbox.body.data.find((x) => x.title.startsWith('New homework'));
    expect(n.link).toEqual({ type: 'homework', id: res.body.data.id });
    // …and never in another school's student list
    const other = await request(app).get('/school-portal/student/notifications').set(auth(ctx.b.studentToken));
    expect(other.body.data.some((x) => x.title.startsWith('New homework'))).toBe(false);
  });

  it('respects Notification settings: homework switched off → no push, but still listed in-app', async () => {
    await request(app).patch('/school-portal/student/settings').set(auth(ctx.a.studentToken)).send({ notificationPrefs: { homework: false } });
    const res = await request(app).post('/school-portal/teacher/homework').set(auth(ctx.a.token))
      .send({ title: 'Quiet homework', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, assignedDate: ymd(), dueDate: ymd(2) });
    await waitForCalls(1);
    expect(allTokens()).not.toContain('student-sam-device-token-000000000001');
    expect(allTokens()).toContain('parent-pat-device-token-000000000001'); // parent kept it on
    const inbox = await request(app).get('/school-portal/student/notifications').set(auth(ctx.a.studentToken));
    expect(inbox.body.data.some((x) => x.link?.id === res.body.data.id)).toBe(true);
    await request(app).patch('/school-portal/student/settings').set(auth(ctx.a.studentToken)).send({ notificationPrefs: { homework: true } });
  });

  it('attendance: push only when a student NEWLY becomes absent/late — re-saving does not spam', async () => {
    const date = ymd(-1);
    const body = { sectionId: ctx.a.sectionId, date, records: [{ studentId: ctx.a.studentId, status: 'ABSENT' }] };
    await request(app).post('/school-portal/teacher/attendance').set(auth(ctx.a.token)).send(body);
    await waitForCalls(1);
    expect(calls.some((c) => c.data.type === 'attendance' && c.notification.title === 'Marked absent')).toBe(true);
    calls = [];
    await request(app).post('/school-portal/teacher/attendance').set(auth(ctx.a.token)).send(body); // same again
    await new Promise((r) => setTimeout(r, 400));
    expect(calls.length).toBe(0);
    const sheet = await request(app).get('/school-portal/teacher/attendance/today').query({ sectionId: ctx.a.sectionId, date }).set(auth(ctx.a.token));
    await request(app).patch(`/school-portal/teacher/attendance/${sheet.body.data.attendanceId}`).set(auth(ctx.a.token))
      .send({ records: [{ studentId: ctx.a.studentId, status: 'LATE' }] });
    await waitForCalls(1);
    expect(calls.some((c) => c.notification.title === 'Marked late')).toBe(true);
  });

  it('assignment: DRAFT sends nothing; publishing it notifies students', async () => {
    const a = await request(app).post('/school-portal/teacher/assignments').set(auth(ctx.a.token))
      .send({ title: 'Project X', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, assignedDate: ymd(), dueDate: ymd(4), maxMarks: 10, status: 'DRAFT' });
    await new Promise((r) => setTimeout(r, 400));
    expect(calls.length).toBe(0);
    await request(app).patch(`/school-portal/teacher/assignments/${a.body.data.id}`).set(auth(ctx.a.token)).send({ status: 'PUBLISHED' });
    await waitForCalls(1);
    expect(calls[0].data).toMatchObject({ type: 'assignment', id: a.body.data.id });
  });
});

describe('Push on school decisions', () => {
  it('leave approved by HR → the teacher who applied gets it', async () => {
    await request(app).post('/school-portal/teacher/device-tokens').set(auth(ctx.a.token)).send({ token: 'teacher-a-device-token-000000000001' });
    const leave = await request(app).post('/school-portal/teacher/leaves').set(auth(ctx.a.token))
      .send({ leaveType: 'CASUAL', startDate: ymd(30), endDate: ymd(30), reason: 'Wedding' });
    const { hrService } = await import('../src/services/hr.service.js');
    await hrService.approveLeave(ctx.a.schoolId, leave.body.data.id, 'HR');
    await waitForCalls(1);
    expect(calls[0].tokens).toEqual(['teacher-a-device-token-000000000001']);
    expect(calls[0].data).toMatchObject({ type: 'leave', role: 'teacher' });
    expect(calls[0].notification.title).toBe('Leave approved');
  });

  it('student leave rejected → the student gets it', async () => {
    const leave = await request(app).post('/school-portal/student/leaves').set(auth(ctx.a.studentToken))
      .send({ leaveType: 'MEDICAL', startDate: ymd(33), endDate: ymd(33), reason: 'Fever' });
    const { hrService } = await import('../src/services/hr.service.js');
    await hrService.rejectLeave(ctx.a.schoolId, leave.body.data.id, 'Exam day', 'HR');
    await waitForCalls(1);
    const c = calls.find((x) => x.data.role === 'student');
    expect(c.tokens).toContain('student-sam-device-token-000000000001');
    expect(c.notification.body).toContain('Exam day');
  });

  it('exam results published → students of those classes and their parents', async () => {
    const { examService } = await import('../src/services/exam.service.js');
    await examService.updateExam(ctx.a.schoolId, ctx.a.examDraftId, { status: 'PUBLISHED' });
    await waitForCalls(2);
    expect(allTokens()).toEqual(expect.arrayContaining(['student-sam-device-token-000000000001', 'parent-pat-device-token-000000000001']));
    expect(calls[0].data.type).toBe('result');
    calls = [];
    await examService.updateExam(ctx.a.schoolId, ctx.a.examDraftId, { status: 'PUBLISHED', name: 'renamed' }); // already published
    await new Promise((r) => setTimeout(r, 400));
    expect(calls.length).toBe(0);
  });
});
