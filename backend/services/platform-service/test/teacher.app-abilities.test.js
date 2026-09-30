/**
 * Everything a teacher can do in the app that teacher.app-flow.test.js does
 * not already walk through — plus who must NOT be able to do it:
 * a second (subject-only) teacher in the same school, and a teacher from
 * another school. In-memory seed only.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let A; // class teacher of Class 10-A, school A
let S; // subject-only teacher, same section, school A
let B; // teacher of school B
const P = '/school-portal/teacher';
const ymd = (days = 0) => {
  const d = new Date(Date.now() + days * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const as = (tok) => ({
  get: (path, q) => request(app).get(P + path).query(q || {}).set('Authorization', `Bearer ${tok}`),
  post: (path, body, h = {}) => request(app).post(P + path).set({ Authorization: `Bearer ${tok}`, ...h }).send(body),
  patch: (path, body) => request(app).patch(P + path).set('Authorization', `Bearer ${tok}`).send(body),
  del: (path) => request(app).delete(P + path).set('Authorization', `Bearer ${tok}`),
});
async function login(identifier, password) {
  const res = await request(app).post('/school-portal/auth/teacher-login').send({ identifier, password });
  return res;
}

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();

  const { Teacher } = await import('../src/models/Teacher.js');
  const { Subject } = await import('../src/models/Subject.js');
  const { SectionSubject } = await import('../src/models/SectionSubject.js');
  const maths = await Subject.create({ schoolId: ctx.a.schoolId, name: 'Maths', code: 'MAT' });
  const sub = await Teacher.create({
    schoolId: ctx.a.schoolId, employeeId: 'TCH-2', name: 'Sub Teacher', firstName: 'Sub', lastName: 'Teacher',
    email: 'sub@schoola.edu', mobileNumber: '9999900000', status: 'ACTIVE', passwordHash: await bcrypt.hash('Passw0rd!', 10),
    account: { createLoginAccount: true, loginEmail: 'sub@schoola.edu', accountStatus: 'ACTIVE' },
  });
  await SectionSubject.create({
    schoolId: ctx.a.schoolId, academicYearId: ctx.a.yearId, classId: ctx.a.classId, sectionId: ctx.a.sectionId,
    subjectId: maths._id, teacherId: sub._id, status: 'ACTIVE',
  });
  ctx.mathsId = maths._id.toString();
  ctx.subTeacherId = sub._id.toString();

  A = as((await login('teacher@schoola.edu', 'Passw0rd!')).body.token);
  S = as((await login('sub@schoola.edu', 'Passw0rd!')).body.token);
  B = as((await login('teacher@schoolb.edu', 'Passw0rd!')).body.token);
}, 60000);
afterAll(disconnect);

describe('Subject-only teacher (same school)', () => {
  it('sees only their own teaching slot and is not a class teacher', async () => {
    const me = await S.get('/me');
    expect(me.body.data.user.isClassTeacher).toBe(false);
    const slots = await S.get('/teaching-slots');
    expect(slots.body.data).toEqual([expect.objectContaining({ subjectId: ctx.mathsId, subjectName: 'Maths', isClassTeacher: false })]);
  });

  it('cannot create homework for a subject they do not teach', async () => {
    const res = await S.post('/homework', { title: 'x', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, assignedDate: ymd(), dueDate: ymd(2) });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SUBJECT_ACCESS_DENIED');
  });

  it("cannot read, edit or delete the class teacher's homework / assignment", async () => {
    const hw = await A.post('/homework', { title: 'A only', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, assignedDate: ymd(), dueDate: ymd(2) });
    const id = hw.body.data.id;
    expect((await S.get(`/homework/${id}`)).status).toBe(403);
    expect((await S.patch(`/homework/${id}`, { title: 'hijack' })).status).toBe(403);
    expect((await S.del(`/homework/${id}`)).status).toBe(403);
    expect((await S.get(`/homework/${id}/submissions`)).status).toBe(403);
    const asg = await A.post('/assignments', { title: 'A asg', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, assignedDate: ymd(), dueDate: ymd(3), maxMarks: 10 });
    expect((await S.get(`/assignments/${asg.body.data.id}/submissions`)).status).toBe(403);
    // and it never shows up in their list
    expect((await S.get('/homework', { status: 'ALL' })).body.data.map((h) => h.id)).not.toContain(id);
  });

  it('has no Safe Pickup students (class-teacher-only feature)', async () => {
    const res = await S.get('/pickups/eligible-students');
    expect(res.body.data).toEqual([]);
    const init = await S.post('/pickups/initiate', { studentId: ctx.a.studentId });
    expect(init.status).toBe(403);
  });

  it('can still take attendance for the section they teach in', async () => {
    const sheet = await S.get('/attendance/today', { sectionId: ctx.a.sectionId, date: ymd(-5) });
    expect(sheet.status).toBe(200);
    expect(sheet.body.data.isClassTeacher).toBe(false);
  });
});

describe('Teacher from another school', () => {
  it('cannot reach any school-A resource', async () => {
    expect((await B.get(`/sections/${ctx.a.sectionId}/students`)).status).toBe(403);
    expect((await B.get(`/students/${ctx.a.studentId}`)).status).toBe(403);
    expect((await B.get('/attendance/today', { sectionId: ctx.a.sectionId })).status).toBe(403);
    expect((await B.get(`/classes/${ctx.a.classId}/sections`)).status).toBe(403);
    const hw = await A.post('/homework', { title: 'secret', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, assignedDate: ymd(), dueDate: ymd(2) });
    expect([403, 404]).toContain((await B.get(`/homework/${hw.body.data.id}`)).status);
    const post = await B.post('/attendance', { sectionId: ctx.a.sectionId, date: ymd(-6), records: [{ studentId: ctx.a.studentId, status: 'ABSENT' }] });
    expect(post.status).toBe(403);
  });
});

describe('Notifications, devices, documents, photo', () => {
  it('shows only broadcast + own targeted notifications; mark one read; foreign id refused', async () => {
    const { PlatformNotification } = await import('../src/models/PlatformNotification.js');
    const mine = await PlatformNotification.create({ title: 'For A', body: 'x', audiences: ['teacher'], schoolId: 'schoola', recipientRefIds: [ctx.a.teacherId] });
    const other = await PlatformNotification.create({ title: 'For Sub', body: 'x', audiences: ['teacher'], schoolId: 'schoola', recipientRefIds: [ctx.subTeacherId] });
    const bcast = await PlatformNotification.create({ title: 'All teachers', body: 'x', audiences: ['teacher'], schoolId: 'schoola' });
    const list = await A.get('/notifications', { page: 1, limit: 20 });
    const titles = list.body.data.map((n) => n.title);
    expect(titles).toEqual(expect.arrayContaining(['For A', 'All teachers']));
    expect(titles).not.toContain('For Sub');
    const before = (await A.get('/notifications/unread-count')).body.data.unread;
    expect((await A.patch(`/notifications/${mine._id}/read`)).status).toBe(200);
    expect((await A.get('/notifications/unread-count')).body.data.unread).toBe(before - 1);
    expect((await A.patch(`/notifications/${other._id}/read`)).status).toBe(404);
    expect(bcast).toBeTruthy();
  });

  it('registers a push device token (and rejects junk)', async () => {
    const ok = await A.post('/device-tokens', { token: 'fcm-token-abcdefghijklmnopqrstuvwxyz-123', platform: 'android' });
    expect(ok.body.data.registered).toBe(true);
    expect((await A.post('/device-tokens', { token: 'short' })).status).toBe(400);
  });

  it('lists documents (read-only)', async () => {
    const res = await A.get('/documents');
    expect(res.body.data).toHaveProperty('qualificationCertificates');
  });

  it('uploads a profile photo (converted to webp) and refuses a non-image', async () => {
    const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: '#DB2777' } }).png().toBuffer();
    const up = await request(app).patch(`${P}/profile`).set('Authorization', await getBearer('teacher@schoola.edu'))
      .attach('photo', png, { filename: 'me.png', contentType: 'image/png' });
    expect(up.status).toBe(200);
    expect(up.body.data.profilePhoto).toMatch(/\.webp$/);
    const bad = await request(app).patch(`${P}/profile`).set('Authorization', await getBearer('teacher@schoola.edu'))
      .attach('photo', Buffer.from('not an image'), { filename: 'x.png', contentType: 'image/png' });
    expect(bad.status).toBe(400);
  });
});

async function getBearer(email) {
  const res = await login(email, 'Passw0rd!');
  return `Bearer ${res.body.token}`;
}

describe('Workflows not covered by the main walk', () => {
  it('homework reopen after close; dashboard active-homework count follows', async () => {
    const before = (await A.get('/dashboard')).body.data.stats.pendingHomework;
    const hw = await A.post('/homework', { title: 'Reopen me', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, assignedDate: ymd(), dueDate: ymd(1) });
    expect((await A.get('/dashboard')).body.data.stats.pendingHomework).toBe(before + 1);
    await A.patch(`/homework/${hw.body.data.id}`, { status: 'CLOSED' });
    expect((await A.get('/dashboard')).body.data.stats.pendingHomework).toBe(before);
    const re = await A.patch(`/homework/${hw.body.data.id}`, { status: 'ASSIGNED' });
    expect(re.body.data.status).toBe('ASSIGNED');
  });

  it('assignment delete removes it and its submissions', async () => {
    const a = await A.post('/assignments', { title: 'Temp', sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, assignedDate: ymd(), dueDate: ymd(2), maxMarks: 5 });
    expect((await A.del(`/assignments/${a.body.data.id}`)).status).toBe(200);
    expect((await A.get(`/assignments/${a.body.data.id}`)).status).toBe(404);
  });

  it('material shared with the whole class', async () => {
    const pdf = Buffer.from('%PDF-1.4\n%%EOF');
    const up = await request(app).post(`${P}/materials`).set('Authorization', await getBearer('teacher@schoola.edu'))
      .field('title', 'Class notes').field('sectionId', ctx.a.sectionId).field('subjectId', ctx.a.subjectId).field('visibility', 'CLASS')
      .attach('file', pdf, { filename: 'n.pdf', contentType: 'application/pdf' });
    expect(up.body.data.visibility).toBe('CLASS');
  });

  it('a cancelled leave frees its dates for a new request', async () => {
    const l = await A.post('/leaves', { leaveType: 'CASUAL', startDate: ymd(40), endDate: ymd(40), reason: 'Errand' });
    await A.post(`/leaves/${l.body.data.id}/cancel`);
    const again = await A.post('/leaves', { leaveType: 'CASUAL', startDate: ymd(40), endDate: ymd(40), reason: 'Errand' });
    expect(again.status).toBeLessThan(300);
  });

  it('Safe Pickup happy path: initiate (idempotent) → verify → handover → blocked the same day', async () => {
    const key = { 'Idempotency-Key': 'pickup-happy-1' };
    const init = await A.post('/pickups/initiate', { studentId: ctx.a.studentId }, key);
    expect(init.status).toBe(201);
    const replay = await A.post('/pickups/initiate', { studentId: ctx.a.studentId }, key);
    expect(replay.body.data.id).toBe(init.body.data.id);
    const id = init.body.data.id;
    const incomplete = await A.post(`/pickups/${id}/complete`, { handoverConfirmed: true, pickupPersonName: 'Dad', pickupPersonRelationship: 'Parent' });
    expect(incomplete.status).toBe(409); // OTP not verified yet
    const v = await A.post(`/pickups/${id}/verify`, { otp: '123456' });
    expect(v.status).toBe(200);
    const noConfirm = await A.post(`/pickups/${id}/complete`, { handoverConfirmed: false, pickupPersonName: 'Dad', pickupPersonRelationship: 'Parent' });
    expect(noConfirm.status).toBe(400);
    const done = await A.post(`/pickups/${id}/complete`, { handoverConfirmed: true, pickupPersonName: 'Dad', pickupPersonRelationship: 'Parent' });
    expect(done.body.data.status).toBe('COMPLETED');
    const list = await A.get('/pickups/eligible-students');
    expect(list.body.data.find((s) => s.id === ctx.a.studentId).alreadyPickedUpToday).toBe(true);
    expect((await A.post('/pickups/initiate', { studentId: ctx.a.studentId })).status).toBeGreaterThanOrEqual(400);
    // a student without guardian mobile can't start
    expect((await A.post('/pickups/initiate', { studentId: ctx.a.studentNoGuardianId })).status).toBeGreaterThanOrEqual(400);
  });
});

describe('Delete account', () => {
  it('a password, if sent, must be right (the app sends none)', async () => {
    const res = await S.post('/account/delete', { password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('CURRENT_PASSWORD_INVALID');
  });

  it('removes the login everywhere, keeps school data, and an admin can re-issue a login', async () => {
    await S.post('/device-tokens', { token: 'sub-teacher-device-token-0123456789' });
    const hw = await S.post('/homework', { title: 'Maths HW', sectionId: ctx.a.sectionId, subjectId: ctx.mathsId, assignedDate: ymd(), dueDate: ymd(2) });
    const second = as((await login('sub@schoola.edu', 'Passw0rd!')).body.token); // another device

    const del = await S.post('/account/delete', { password: 'Passw0rd!' });
    expect(del.status).toBe(200);
    expect((await S.get('/me')).status).toBe(401);
    expect((await second.get('/me')).status).toBe(401);
    expect((await login('sub@schoola.edu', 'Passw0rd!')).status).toBe(401);

    const { DeviceToken } = await import('../src/models/DeviceToken.js');
    expect(await DeviceToken.countDocuments({ userId: ctx.subTeacherId })).toBe(0);
    const { Teacher } = await import('../src/models/Teacher.js');
    const t = await Teacher.findById(ctx.subTeacherId).lean();
    expect(t.status).toBe('ACTIVE'); // HR record untouched
    expect(t.appAccountDeletedAt).toBeTruthy();
    const { Homework } = await import('../src/models/Homework.js');
    expect(await Homework.exists({ _id: hw.body.data.id })).toBeTruthy(); // school data kept

    const { academicService } = await import('../src/services/academic.service.js');
    await academicService.setTeacherPassword(ctx.a.schoolId, ctx.subTeacherId, 'Fresh#Pass1');
    const back = await login('sub@schoola.edu', 'Fresh#Pass1');
    expect(back.status).toBe(200);
    expect((await Teacher.findById(ctx.subTeacherId).lean()).appAccountDeletedAt).toBeNull();
  });
});
