import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const EMAIL = 'teacher@schoola.edu';
const PASSWORD = 'Passw0rd!';

async function login(password = PASSWORD) {
  const res = await request(app).post('/school-portal/auth/teacher-login').send({ identifier: EMAIL, password });
  return res.body.token;
}

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Teacher session revocation', () => {
  it('logout revokes the token that was used', async () => {
    const token = await login();
    expect((await request(app).get('/school-portal/teacher/me').set(auth(token))).status).toBe(200);
    expect((await request(app).post('/school-portal/teacher/auth/logout').set(auth(token))).status).toBe(200);
    const after = await request(app).get('/school-portal/teacher/me').set(auth(token));
    expect(after.status).toBe(401);
  });

  it('change-password returns a fresh token and revokes the old one', async () => {
    const oldToken = await login();
    const res = await request(app)
      .patch('/school-portal/teacher/change-password')
      .set(auth(oldToken))
      .send({ currentPassword: PASSWORD, newPassword: 'NewPassw0rd!' });
    expect(res.status).toBe(200);
    const fresh = res.body.data.token;
    expect(fresh).toBeTruthy();
    expect((await request(app).get('/school-portal/teacher/me').set(auth(oldToken))).status).toBe(401);
    expect((await request(app).get('/school-portal/teacher/me').set(auth(fresh))).status).toBe(200);
    // restore for the other tests
    const back = await request(app)
      .patch('/school-portal/teacher/change-password')
      .set(auth(fresh))
      .send({ currentPassword: 'NewPassw0rd!', newPassword: PASSWORD });
    expect(back.status).toBe(200);
  });

  it('rejects reusing the current password as the new one', async () => {
    const token = await login();
    const res = await request(app)
      .patch('/school-portal/teacher/change-password')
      .set(auth(token))
      .send({ currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(res.status).toBe(400);
  });

  it('a deactivated teacher is locked out immediately, even with a live token', async () => {
    const token = await login();
    const { Teacher } = await import('../src/models/Teacher.js');
    await Teacher.updateOne({ _id: ctx.a.teacherId }, { $set: { status: 'INACTIVE' } });
    const res = await request(app).get('/school-portal/teacher/profile').set(auth(token));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TEACHER_INACTIVE');
    await Teacher.updateOne({ _id: ctx.a.teacherId }, { $set: { status: 'ACTIVE' } });
  });
});

describe('Teacher app contract additions', () => {
  it('teaching-slots lists only the teacher own section/subject pairs', async () => {
    const token = await login();
    const res = await request(app).get('/school-portal/teacher/teaching-slots').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, isClassTeacher: true });
  });

  it('attendance sheet carries attendanceId + locked', async () => {
    const token = await login();
    const sheet = await request(app)
      .get('/school-portal/teacher/attendance/today')
      .query({ sectionId: ctx.a.sectionId })
      .set(auth(token));
    expect(sheet.status).toBe(200);
    expect(sheet.body.data).toHaveProperty('attendanceId');
    expect(sheet.body.data.locked).toBe(false);
  });

  it('me exposes the safe-pickup feature flag', async () => {
    const token = await login();
    const res = await request(app).get('/school-portal/teacher/me').set(auth(token));
    expect(typeof res.body.data.school.features.safePickup).toBe('boolean');
  });
});

describe('Teacher input hardening', () => {
  it('a one-day leave works and an overlapping one is refused', async () => {
    const token = await login();
    const first = await request(app)
      .post('/school-portal/teacher/leaves')
      .set(auth(token))
      .send({ leaveType: 'CASUAL', startDate: '2030-01-10', endDate: '2030-01-10', reason: 'Family function' });
    expect(first.status).toBeLessThan(300);
    expect(first.body.data.totalDays).toBe(1);
    const overlap = await request(app)
      .post('/school-portal/teacher/leaves')
      .set(auth(token))
      .send({ leaveType: 'CASUAL', startDate: '2030-01-09', endDate: '2030-01-11', reason: 'Trip' });
    expect(overlap.status).toBe(409);
    expect(overlap.body.code).toBe('LEAVE_OVERLAP');
  });

  it('strips non-http attachment links from homework', async () => {
    const token = await login();
    const res = await request(app)
      .post('/school-portal/teacher/homework')
      .set(auth(token))
      .send({
        title: 'Links',
        sectionId: ctx.a.sectionId,
        subjectId: ctx.a.subjectId,
        dueDate: '2030-01-20',
        attachments: [
          { name: 'bad', url: 'javascript:alert(1)' },
          { name: 'good', url: 'https://example.com/a.pdf' },
        ],
      });
    expect(res.status).toBeLessThan(300);
    expect(res.body.data.attachments.map((a) => a.url)).toEqual(['https://example.com/a.pdf']);
  });

  it('refuses exam marks filed under a class the section does not belong to', async () => {
    const token = await login();
    const { Exam } = await import('../src/models/Exam.js');
    const { SchoolClass } = await import('../src/models/SchoolClass.js');
    const other = await SchoolClass.create({
      schoolId: ctx.a.schoolId, academicYearId: ctx.a.yearId, name: 'Class 9', code: 'C9', numericOrder: 9,
    });
    const exam = await Exam.create({
      schoolId: ctx.a.schoolId, academicYearId: ctx.a.yearId, name: 'UT-x', examType: 'UNIT_TEST',
      startDate: new Date(), endDate: new Date(), classIds: [ctx.a.classId, other._id], status: 'IN_PROGRESS',
    });
    const res = await request(app)
      .post(`/school-portal/teacher/exams/${exam._id}/marks`)
      .set(auth(token))
      .send({
        classId: other._id.toString(), sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId,
        marksList: [{ studentId: ctx.a.studentId, marksObtained: 10, attendanceStatus: 'PRESENT' }],
      });
    expect([400, 403]).toContain(res.status);
  });

  it('self profile rejects document uploads and bad phone numbers', async () => {
    const token = await login();
    const bad = await request(app).patch('/school-portal/teacher/profile').set(auth(token)).send({ phone: 'call me' });
    expect(bad.status).toBe(400);
    const doc = await request(app)
      .patch('/school-portal/teacher/profile')
      .set(auth(token))
      .attach('panDocuments', Buffer.from('fake'), { filename: 'pan.png', contentType: 'image/png' });
    expect(doc.status).toBeGreaterThanOrEqual(400);
  });
});
