/**
 * End-to-end walk through the Student mobile app (app/src/app/student/**),
 * screen by screen, with the same requests the app sends (app/src/api/student.js).
 * Doc: docs/flutter-apps/02-student-app-flow.md. In-memory seed only.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let token;
const P = '/school-portal/student';
const ymd = (days = 0) => {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const get = (path, q) => request(app).get(P + path).query(q || {}).set('Authorization', `Bearer ${token}`);
const send = (m, path, body, h = {}) => request(app)[m](P + path).set({ Authorization: `Bearer ${token}`, ...h }).send(body);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  const { StudyMaterial } = await import('../src/models/StudyMaterial.js');
  const { Event } = await import('../src/models/Event.js');
  const { PlatformNotification } = await import('../src/models/PlatformNotification.js');
  const { Announcement } = await import('../src/models/Communication.js');
  const a = ctx.a;
  const m = await StudyMaterial.create({
    schoolId: a.schoolId, academicYearId: a.yearId, classId: a.classId, sectionId: a.sectionId, subjectId: a.subjectId,
    subjectName: 'English', teacherId: a.teacherId, title: 'Grammar notes', fileName: 'g.pdf', fileType: 'application/pdf',
    fileSize: 10, url: '/uploads/teacher-resources/g.pdf', visibility: 'SECTION', status: 'ACTIVE',
  });
  ctx.materialId = m._id.toString();
  await Event.create({ schoolId: a.schoolId, title: 'Science Fair', startAt: new Date(Date.now() + 3 * 86400000), endAt: new Date(Date.now() + 3 * 86400000 + 3600000), audiences: ['ALL'] });
  await PlatformNotification.create({ title: 'Mine', body: 'x', audiences: ['student'], schoolId: 'schoola', recipientRefIds: [a.studentId] });
  await PlatformNotification.create({ title: 'Someone else', body: 'x', audiences: ['student'], schoolId: 'schoola', recipientRefIds: [a.studentNoGuardianId] });
  await Announcement.create({ schoolId: a.schoolId, title: 'Teachers only', body: 'x', audiences: ['TEACHERS'], status: 'PUBLISHED', publishAt: new Date(Date.now() - 1000) });
}, 60000);
afterAll(disconnect);

describe('Student app — full flow', () => {
  it('Login → me (theme, section, session)', async () => {
    const res = await request(app).post('/school-portal/auth/student-login').send({ identifier: ctx.a.studentLoginEmail, password: ctx.a.studentPassword });
    expect(res.status).toBe(200);
    token = res.body.token;
    expect(res.body.user.role).toBe('STUDENT');
    expect(res.body.school.primaryColor).toBeTruthy();
    const me = await get('/me');
    expect(me.status).toBe(200);
    expect(me.body.data.school.academicSession).toBe('2026-27');
  });

  it('Home: dashboard, today, upcoming, unread badge', async () => {
    for (const p of ['/dashboard', '/today', '/upcoming', '/notifications/unread-count']) {
      const r = await get(p);
      expect(r.status, p).toBe(200);
    }
  });

  it('Timetable week', async () => {
    const r = await get('/timetable');
    expect(r.status).toBe(200);
  });

  it('Homework: list → detail → submit (file + remarks, idempotent) → cannot see other sections', async () => {
    const list = await get('/homework', { page: 1, limit: 20 });
    expect(list.body.data.map((h) => h.id)).toContain(ctx.a.homeworkId);
    const d = await get(`/homework/${ctx.a.homeworkId}`);
    expect(d.body.data.title).toBe('HW Ch 1');
    const pdf = Buffer.from('%PDF-1.4\n%%EOF');
    const sub = () =>
      request(app).post(`${P}/homework/${ctx.a.homeworkId}/submission`).set({ Authorization: `Bearer ${token}`, 'Idempotency-Key': 'hw-sub-1' })
        .field('remarks', 'Done').attach('file', pdf, { filename: 'answer.pdf', contentType: 'application/pdf' });
    const first = await sub();
    expect(first.status).toBeLessThan(300);
    const replay = await sub();
    expect(replay.headers['idempotency-replayed']).toBe('true');
    const fake = await request(app).post(`${P}/homework/${ctx.a.homeworkId}/submission`).set('Authorization', `Bearer ${token}`)
      .field('remarks', 'x').attach('file', Buffer.from('MZ-exe'), { filename: 'a.pdf', contentType: 'application/pdf' });
    expect(fake.status).toBe(400);
    const otherSchoolHw = await get(`/homework/${ctx.b.homeworkId}`);
    expect([403, 404]).toContain(otherSchoolHw.status);
  });

  it('Classwork + study material (short-lived download URL)', async () => {
    expect((await get('/classwork', { page: 1 })).status).toBe(200);
    const mats = await get('/materials', { page: 1 });
    expect(mats.body.data.map((m) => m.id)).toContain(ctx.materialId);
    const url = await get(`/materials/${ctx.materialId}/download-url`);
    expect(url.status).toBe(200);
    expect(JSON.stringify(url.body.data)).toMatch(/url/i);
  });

  it('Attendance summary + monthly calendar', async () => {
    const s = await get('/attendance/summary');
    expect(s.status).toBe(200);
    const m = await get('/attendance/monthly', { month: ymd(-3).slice(0, 7) });
    expect(m.status).toBe(200);
  });

  it('Exams, published results only, report card', async () => {
    const exams = await get('/exams', { page: 1 });
    expect(exams.status).toBe(200);
    expect((await get(`/exams/${ctx.a.examId}`)).status).toBe(200);
    expect((await get(`/exams/${ctx.a.examId}/schedule`)).status).toBe(200);
    const results = await get('/results', { page: 1 });
    const ids = results.body.data.map((r) => r.examId || r.exam?.id || r.id);
    expect(JSON.stringify(ids)).toContain(ctx.a.examId);
    expect(JSON.stringify(ids)).not.toContain(ctx.a.examDraftId);
    const draft = await get(`/results/${ctx.a.examDraftId}`);
    expect(draft.status).toBeGreaterThanOrEqual(400);
    expect((await get(`/results/${ctx.a.examId}`)).body.data).toBeTruthy();
    expect((await get('/report-card')).status).toBe(200);
  });

  it('Fees are view-only: summary, pending, invoice, history', async () => {
    const sum = await get('/fees/summary');
    expect(sum.status).toBe(200);
    expect((await get('/fees/pending')).status).toBe(200);
    const inv = await get('/fees/invoices', { page: 1 });
    expect(inv.body.data.map((i) => i.id)).toContain(ctx.a.invoiceId);
    expect((await get(`/fees/invoices/${ctx.a.invoiceId}`)).status).toBe(200);
    expect((await get(`/fees/invoices/${ctx.b.invoiceId}`)).status).toBeGreaterThanOrEqual(403);
    expect((await get('/fees/history', { page: 1 })).status).toBe(200);
  });

  it('Leave: apply → edit → cancel; overlap + bad dates refused', async () => {
    const applied = await send('post', '/leaves', { leaveType: 'MEDICAL', startDate: ymd(20), endDate: ymd(21), reason: 'Fever' });
    expect(applied.status).toBeLessThan(300);
    const id = applied.body.data.id;
    const overlap = await send('post', '/leaves', { leaveType: 'CASUAL', startDate: ymd(21), endDate: ymd(22), reason: 'x' });
    expect(overlap.status).toBe(409);
    const edited = await send('patch', `/leaves/${id}`, { reason: 'High fever' });
    expect(edited.status).toBe(200);
    expect((await get(`/leaves/${id}`)).body.data.reason).toBe('High fever');
    expect((await send('post', `/leaves/${id}/cancel`)).status).toBe(200);
    expect((await send('patch', `/leaves/${id}`, { reason: 'late edit' })).status).toBe(409);
    expect((await send('post', '/leaves', { leaveType: 'CASUAL', startDate: ymd(5), endDate: ymd(3), reason: 'x' })).status).toBe(400);
  });

  it('Inbox: notices audience-filtered + read, events, own notifications only', async () => {
    const notices = await get('/notices', { page: 1 });
    const titles = notices.body.data.map((n) => n.title);
    expect(titles).toContain('Welcome');
    expect(titles).not.toContain('Teachers only');
    expect((await send('patch', `/notices/${ctx.a.noticeId}/read`)).status).toBe(200);
    expect((await send('patch', '/notices/read-all')).status).toBe(200);
    const ev = await get('/events', { page: 1, scope: 'upcoming' });
    expect(ev.body.data.map((e) => e.title)).toContain('Science Fair');
    const notif = await get('/notifications', { page: 1 });
    const nt = notif.body.data.map((n) => n.title);
    expect(nt).toContain('Mine');
    expect(nt).not.toContain('Someone else');
    expect((await send('patch', '/notifications/read-all')).status).toBe(200);
    expect((await get('/notifications/unread-count')).body.data.unread).toBe(0);
    expect((await send('post', '/device-tokens', { token: 'student-device-token-0123456789abcdef', platform: 'android' })).status).toBeLessThan(300);
  });

  it('Profile: read, academic info, guardians, documents, settings; protected fields refused', async () => {
    expect((await get('/profile')).status).toBe(200);
    expect((await get('/academic-info')).status).toBe(200);
    expect((await get('/guardians')).status).toBe(200);
    expect((await get('/documents')).status).toBe(200);
    const s = await send('patch', '/settings', { notificationPrefs: { homework: false } });
    expect(s.body.data.notificationPrefs.homework).toBe(false);
    // Only phone/address are self-editable; anything else is silently ignored.
    await send('patch', '/profile', { admissionNumber: 'HACK', status: 'INACTIVE' });
    const after = await get('/profile');
    expect(JSON.stringify(after.body.data)).not.toContain('HACK');
    expect((await get('/me')).status).toBe(200);
  });

  it('Teacher/parent endpoints are closed to a student token', async () => {
    const t = await request(app).get('/school-portal/teacher/me').set('Authorization', `Bearer ${token}`);
    expect(t.status).toBe(403);
    const p = await request(app).get('/school-portal/parent/me').set('Authorization', `Bearer ${token}`);
    expect(p.status).toBe(403);
  });

  it('Change password keeps this device; logout ends the session', async () => {
    const res = await send('patch', '/change-password', { currentPassword: ctx.a.studentPassword, newPassword: 'Student#New1' });
    expect(res.status).toBe(200);
    const old = token;
    token = res.body.data.token;
    expect((await request(app).get(`${P}/me`).set('Authorization', `Bearer ${old}`)).status).toBe(401);
    expect((await get('/me')).status).toBe(200);
    expect((await send('post', '/auth/logout')).status).toBe(200);
    expect((await get('/me')).status).toBe(401);
  });
});
