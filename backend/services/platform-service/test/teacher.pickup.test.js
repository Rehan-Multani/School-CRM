import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 90000);
afterAll(disconnect);

// Each test starts from a clean slate — no leftover active / completed sessions.
beforeEach(async () => {
  const { StudentPickupSession } = await import('../src/models/StudentPickupSession.js');
  await StudentPickupSession.deleteMany({});
});

const initiate = (student = ctx?.a.studentId, key, token = ctx?.a.token) => {
  const r = request(app).post('/school-portal/teacher/pickups/initiate').set(auth(token));
  if (key) r.set('Idempotency-Key', key);
  return r.send({ studentId: student });
};
const verify = (id, otp, token = ctx.a.token) =>
  request(app).post(`/school-portal/teacher/pickups/${id}/verify`).set(auth(token)).send({ otp });
const complete = (id, body, token = ctx.a.token) =>
  request(app).post(`/school-portal/teacher/pickups/${id}/complete`).set(auth(token)).send(body);

describe('Safe pickup — happy path', () => {
  it('initiate → verify(123456) → complete(handoverConfirmed=true)', async () => {
    const init = await initiate();
    expect(init.status).toBe(201);
    expect(init.body.data.status).toBe('OTP_SENT');
    expect(init.body.data.maskedMobile).toBe('******0000');
    expect(init.body.data).not.toHaveProperty('guardianMobile');
    expect(init.body.data).not.toHaveProperty('otpHash');
    const id = init.body.data.id;

    const v = await verify(id, '123456');
    expect(v.status).toBe(200);
    expect(v.body.data.status).toBe('VERIFIED');

    const early = await complete(id, { pickupPersonRelationship: 'Parent' });
    expect(early.status).toBe(400);
    expect(early.body.code).toBe('HANDOVER_NOT_CONFIRMED');

    const done = await complete(id, { handoverConfirmed: true, pickupPersonName: 'Uncle', pickupPersonRelationship: 'Relative' });
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe('COMPLETED');

    const reuse = await verify(id, '123456');
    expect(reuse.status).toBe(409);
    expect(reuse.body.code).toBe('PICKUP_ALREADY_COMPLETED');
  });

  it('a completed pickup blocks a same-day re-initiate for that student', async () => {
    const init = await initiate();
    await verify(init.body.data.id, '123456');
    await complete(init.body.data.id, { handoverConfirmed: true });
    const again = await initiate();
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('STUDENT_ALREADY_PICKED_UP');
  });
});

describe('Safe pickup — feature gating', () => {
  it('school OFF → PICKUP_FEATURE_DISABLED', async () => {
    const { School } = await import('../src/models/School.js');
    await School.updateOne({ _id: ctx.b.schoolId }, { $set: { 'settings.safePickupEnabled': false } });
    const res = await initiate(ctx.b.studentId, null, ctx.b.token);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PICKUP_FEATURE_DISABLED');
    await School.updateOne({ _id: ctx.b.schoolId }, { $set: { 'settings.safePickupEnabled': true } });
  });

  it('class OFF → CLASS_PICKUP_DISABLED', async () => {
    const { SchoolClass } = await import('../src/models/SchoolClass.js');
    await SchoolClass.updateOne({ _id: ctx.b.classId }, { $set: { safePickupEnabled: false } });
    const res = await initiate(ctx.b.studentId, null, ctx.b.token);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CLASS_PICKUP_DISABLED');
    await SchoolClass.updateOne({ _id: ctx.b.classId }, { $set: { safePickupEnabled: true } });
  });
});

describe('Safe pickup — class-teacher-only tab', () => {
  it('a subject teacher (not class teacher) sees an empty list and cannot initiate', async () => {
    const mongoose = (await import('mongoose')).default;
    const { Teacher } = await import('../src/models/Teacher.js');
    const { SectionSubject } = await import('../src/models/SectionSubject.js');
    const { Subject } = await import('../src/models/Subject.js');
    const { signAccessToken } = await import('../../shared/generateToken.js');
    const { env } = await import('../src/config/env.js');

    const subj = await Subject.create({ schoolId: ctx.a.schoolId, name: 'Music', code: 'MUS' });
    const t2 = await Teacher.create({
      schoolId: ctx.a.schoolId, employeeId: 'TCH-2', name: 'Subject Only', firstName: 'Subject', lastName: 'Only',
      email: 'subject@schoola.edu', mobileNumber: '9111111111', status: 'ACTIVE',
    });
    await SectionSubject.create({
      schoolId: ctx.a.schoolId, academicYearId: ctx.a.yearId, classId: ctx.a.classId, sectionId: ctx.a.sectionId,
      subjectId: subj._id, teacherId: t2._id, status: 'ACTIVE',
    });
    const t2Token = signAccessToken(
      { sub: t2._id.toString(), teacherId: t2._id.toString(), schoolId: ctx.a.schoolId, role: 'TEACHER', name: t2.name },
      { secret: env.jwtSecret, expiresIn: '1h' }
    );

    const me = await request(app).get('/school-portal/teacher/me').set(auth(t2Token));
    expect(me.body.data.teacher.isClassTeacher).toBe(false);

    const list = await request(app)
      .get('/school-portal/teacher/pickups/eligible-students')
      .set(auth(t2Token));
    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([]);

    const init = await request(app)
      .post('/school-portal/teacher/pickups/initiate')
      .set(auth(t2Token))
      .send({ studentId: ctx.a.studentId });
    expect(init.status).toBe(403);
    expect(init.body.code).toBe('NOT_CLASS_TEACHER');
  });
});

describe('Safe pickup — authz & tenant isolation', () => {
  it('teacher cannot initiate for a student outside their sections (403)', async () => {
    const res = await initiate(ctx.b.studentId); // school-A teacher, school-B student
    expect(res.status).toBe(403);
  });

  it("another school's teacher gets 404 (no leak) on a session id", async () => {
    const init = await initiate(ctx.b.studentId, null, ctx.b.token);
    const cross = await request(app).get(`/school-portal/teacher/pickups/${init.body.data.id}`).set(auth(ctx.a.token));
    expect(cross.status).toBe(404);
  });

  it('no guardian mobile → 422 PARENT_MOBILE_NOT_FOUND', async () => {
    // the shared fixture may mark this student ABSENT today; the absent-guard
    // (409) would otherwise fire before the guardian check — clear it first.
    const { StudentAttendance } = await import('../src/models/StudentAttendance.js');
    await StudentAttendance.updateMany(
      { schoolId: ctx.a.schoolId, 'entries.studentId': ctx.a.studentNoGuardianId },
      { $set: { 'entries.$[e].status': 'PRESENT' } },
      { arrayFilters: [{ 'e.studentId': ctx.a.studentNoGuardianId }] }
    );
    const res = await initiate(ctx.a.studentNoGuardianId);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('PARENT_MOBILE_NOT_FOUND');
  });
});

describe('Safe pickup — OTP rules', () => {
  it('wrong OTP → OTP_INVALID; 5th wrong → 429 + session FAILED', async () => {
    const id = (await initiate()).body.data.id;
    let last;
    for (let i = 0; i < 5; i += 1) last = await verify(id, '000000');
    expect(last.status).toBe(429);
    expect(last.body.code).toBe('OTP_ATTEMPTS_EXCEEDED');
    const sess = await request(app).get(`/school-portal/teacher/pickups/${id}`).set(auth(ctx.a.token));
    expect(sess.body.data.status).toBe('FAILED');
  });

  it('expired OTP → 410 PICKUP_SESSION_EXPIRED', async () => {
    const id = (await initiate()).body.data.id;
    const { StudentPickupSession } = await import('../src/models/StudentPickupSession.js');
    await StudentPickupSession.updateOne({ _id: id }, { $set: { otpExpiresAt: new Date(Date.now() - 5000) } });
    const res = await verify(id, '123456');
    expect(res.status).toBe(410);
    expect(res.body.code).toBe('PICKUP_SESSION_EXPIRED');
  });

  it('immediate resend → 429 OTP_RATE_LIMITED', async () => {
    const id = (await initiate()).body.data.id;
    const res = await request(app).post(`/school-portal/teacher/pickups/${id}/resend-otp`).set(auth(ctx.a.token));
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('OTP_RATE_LIMITED');
  });

  it('cancel invalidates the session', async () => {
    const id = (await initiate()).body.data.id;
    const c = await request(app).post(`/school-portal/teacher/pickups/${id}/cancel`).set(auth(ctx.a.token));
    expect(c.body.data.status).toBe('CANCELLED');
    const v = await verify(id, '123456');
    expect(v.body.code).toBe('PICKUP_SESSION_CANCELLED');
  });
});

describe('Safe pickup — idempotency & anti-bypass', () => {
  it('duplicate initiate with same Idempotency-Key → one session', async () => {
    const a = await initiate(ctx.a.studentId, 'k-idem');
    const b = await initiate(ctx.a.studentId, 'k-idem');
    expect(a.body.data.id).toBe(b.body.data.id);
  });

  it('second initiate (no key) while one active → 409 PICKUP_ALREADY_ACTIVE', async () => {
    await initiate();
    const b = await initiate();
    expect(b.status).toBe(409);
    expect(b.body.code).toBe('PICKUP_ALREADY_ACTIVE');
  });

  it('body status / ?skipOtp / ?force cannot bypass OTP', async () => {
    const init = await request(app)
      .post('/school-portal/teacher/pickups/initiate?skipOtp=true')
      .set(auth(ctx.a.token))
      .send({ studentId: ctx.a.studentId, status: 'COMPLETED', handoverConfirmed: true });
    expect(init.body.data.status).toBe('OTP_SENT');
    const done = await request(app)
      .post(`/school-portal/teacher/pickups/${init.body.data.id}/complete?force=true`)
      .set(auth(ctx.a.token))
      .send({ handoverConfirmed: true });
    expect(done.status).toBe(409);
    expect(done.body.code).toBe('PICKUP_NOT_VERIFIED');
  });
});

describe('Safe pickup — School Admin config & history', () => {
  it('GET settings returns school + per-class flags', async () => {
    const res = await request(app).get('/school-portal/settings/safe-pickup').set(auth(ctx.a.adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.schoolEnabled).toBe(true);
    expect(res.body.data.classes.some((c) => c.id === ctx.a.classId && c.safePickupEnabled)).toBe(true);
  });

  it('PATCH class flag toggles', async () => {
    const off = await request(app)
      .patch(`/school-portal/academic/classes/${ctx.a.classId}/pickup`)
      .set(auth(ctx.a.adminToken))
      .send({ safePickupEnabled: false });
    expect(off.body.data.safePickupEnabled).toBe(false);
    await request(app)
      .patch(`/school-portal/academic/classes/${ctx.a.classId}/pickup`)
      .set(auth(ctx.a.adminToken))
      .send({ safePickupEnabled: true });
  });

  it('history is school-scoped, masks the mobile, and never leaks the raw number', async () => {
    const init = await initiate();
    await verify(init.body.data.id, '123456');
    await complete(init.body.data.id, { handoverConfirmed: true });

    const res = await request(app).get('/school-portal/pickups/history').set(auth(ctx.a.adminToken));
    expect(res.status).toBe(200);
    const done = res.body.data.find((r) => r.status === 'COMPLETED');
    expect(done).toBeTruthy();
    expect(done.maskedMobile).toMatch(/^\*+\d{4}$/);
    expect(JSON.stringify(res.body)).not.toMatch(/9876500000/);
  });
});
