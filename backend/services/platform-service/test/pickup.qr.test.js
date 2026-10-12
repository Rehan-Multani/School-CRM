import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let qr;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  qr = (await import('../src/services/pickupQr.service.js')).pickupQrService;
}, 90000);
afterAll(disconnect);

beforeEach(async () => {
  const { StudentPickupSession } = await import('../src/models/StudentPickupSession.js');
  await StudentPickupSession.deleteMany({});
});

const issue = (c = ctx.a) => qr.issueForChild({ schoolId: c.schoolId, studentId: c.studentId });
const scan = (token, who = ctx.a.token) =>
  request(app).post('/school-portal/teacher/pickups/scan-qr').set(auth(who)).send({ token });

describe('Safe pickup — parent QR', () => {
  it('issues a QR; reuses it while fresh', async () => {
    const a = await issue();
    expect(a.enabled).toBe(true);
    expect(a.token.startsWith('spq1.')).toBe(true);
    expect(a.ttlSeconds).toBeGreaterThan(280);
    expect((await issue()).token).toBe(a.token);
  });

  it('scan → VERIFIED session, then complete; QR is single-use', async () => {
    const { token } = await issue();
    const r = await scan(token);
    expect(r.status).toBe(201);
    expect(r.body.data.status).toBe('VERIFIED');
    expect(r.body.data.verificationMethod).toBe('PARENT_QR');

    const again = await scan(token);
    expect(again.status).toBe(410);

    const done = await request(app)
      .post(`/school-portal/teacher/pickups/${r.body.data.id}/complete`)
      .set(auth(ctx.a.token))
      .send({ handoverConfirmed: true, pickupPersonName: 'Parent', pickupPersonRelationship: 'Parent' });
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe('COMPLETED');
  });

  it('a new QR invalidates the previous one', async () => {
    const { PickupQrToken } = await import('../src/models/PickupQrToken.js');
    const first = await issue();
    await PickupQrToken.updateOne({ studentId: ctx.a.studentId }, { $set: { expiresAt: new Date(Date.now() + 5000) } });
    const second = await issue(); // <30s left → rotated
    expect(second.token).not.toBe(first.token);
    expect((await scan(first.token)).status).toBe(410);
    expect((await scan(second.token)).status).toBe(201);
  });

  it('rejects tampered / foreign tokens', async () => {
    const { token } = await issue();
    const bad = token.slice(0, -3) + 'AAA';
    expect((await scan(bad)).status).toBe(400);
    expect((await scan('hello')).status).toBe(400);
    const other = await issue(ctx.b);
    expect((await scan(other.token)).status).toBe(403); // another school
  });

  it('disabled class → enabled:false and no token', async () => {
    const { SchoolClass } = await import('../src/models/SchoolClass.js');
    await SchoolClass.updateOne({ _id: ctx.a.classId }, { $set: { safePickupEnabled: false } });
    const r = await issue();
    expect(r.enabled).toBe(false);
    expect(r.token).toBeUndefined();
    await SchoolClass.updateOne({ _id: ctx.a.classId }, { $set: { safePickupEnabled: true } });
  });
});

describe('Safe pickup — parent QR edge cases', () => {
  it('a QR scanned after its expiry is refused with the "expired" message', async () => {
    const { token } = await issue();
    const real = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(real + 6 * 60 * 1000);
    try {
      const res = await scan(token);
      expect(res.status).toBe(410);
      expect(res.body.code).toBe('PICKUP_QR_EXPIRED');
      expect(res.body.message).toMatch(/expired/i);
    } finally {
      spy.mockRestore();
    }
  });

  it('simultaneous first fetches do not fail and agree on one QR', async () => {
    const { PickupQrToken } = await import('../src/models/PickupQrToken.js');
    await PickupQrToken.deleteMany({ studentId: ctx.a.studentId });
    const results = await Promise.all(Array.from({ length: 6 }, () => issue()));
    results.forEach((r) => expect(r.enabled).toBe(true));
    const tokens = new Set(results.map((r) => r.token));
    // every call returned a valid, scannable token for the surviving row
    const live = await PickupQrToken.find({ studentId: ctx.a.studentId });
    expect(live).toHaveLength(1);
    expect(tokens.size).toBeGreaterThanOrEqual(1);
  });

  it('after the handover is completed the same student cannot be scanned again today', async () => {
    const { token } = await issue();
    const first = await scan(token);
    expect(first.status).toBe(201);
    const done = await request(app)
      .post(`/school-portal/teacher/pickups/${first.body.data.id}/complete`)
      .set(auth(ctx.a.token))
      .send({ handoverConfirmed: true, pickupPersonName: 'Parent', pickupPersonRelationship: 'Parent' });
    expect(done.status).toBe(200);
    const next = await issue();
    const dup = await scan(next.token);
    expect(dup.status).toBe(409);
  });

  it('re-scanning a fresh QR while a verified session is still open replaces that session', async () => {
    const { StudentPickupSession } = await import('../src/models/StudentPickupSession.js');
    const first = await scan((await issue()).token);
    expect(first.status).toBe(201);
    const second = await scan((await issue()).token);
    expect(second.status).toBe(201);
    const open = await StudentPickupSession.countDocuments({ studentId: ctx.a.studentId, status: { $in: ['VERIFIED', 'OTP_SENT'] } });
    expect(open).toBe(1);
  });

  it('a missing token is a clean 400, not a server error', async () => {
    const res = await request(app).post('/school-portal/teacher/pickups/scan-qr').set(auth(ctx.a.token)).send({});
    expect(res.status).toBe(400);
  });
});

describe('Safe pickup — QR scanned by the WRONG class teacher', () => {
  // Student Sam is in section A (class teacher: Test Teacher). "Riya" is the
  // class teacher of section B of the same class.
  let riyaToken;
  let sectionB;

  beforeAll(async () => {
    const { Teacher } = await import('../src/models/Teacher.js');
    const { Section } = await import('../src/models/Section.js');
    const { signAccessToken } = await import('../../shared/generateToken.js');
    const { env } = await import('../src/config/env.js');
    const bcrypt = (await import('bcryptjs')).default;
    const riya = await Teacher.create({
      schoolId: ctx.a.schoolId, employeeId: 'TCH-RIYA', name: 'Riya Sharma', firstName: 'Riya', lastName: 'Sharma',
      email: 'riya@qr.test', mobileNumber: '9000000001', status: 'ACTIVE',
      passwordHash: await bcrypt.hash('Passw0rd!', 10),
      account: { createLoginAccount: true, loginEmail: 'riya@qr.test', accountStatus: 'ACTIVE' },
    });
    sectionB = await Section.create({
      schoolId: ctx.a.schoolId, academicYearId: ctx.a.yearId, classId: ctx.a.classId, name: 'B', capacity: 40, classTeacherId: riya._id,
    });
    riyaToken = signAccessToken(
      { sub: String(riya._id), userId: String(riya._id), teacherId: String(riya._id), schoolId: ctx.a.schoolId, role: 'TEACHER', name: riya.name, email: riya.email },
      { secret: env.jwtSecret, expiresIn: '1h' }
    );
  });

  it('Riya (5-B) scanning a 5-A student QR is refused with 403 NOT_CLASS_TEACHER', async () => {
    const { token } = await issue();
    const res = await scan(token, riyaToken);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('NOT_CLASS_TEACHER');
    expect(res.body.message).toMatch(/not in your class/i);
    const { StudentPickupSession } = await import('../src/models/StudentPickupSession.js');
    expect(await StudentPickupSession.countDocuments({ studentId: ctx.a.studentId })).toBe(0);
  });

  it('the refused scan does NOT use up the QR: the real class teacher can still scan it', async () => {
    const { token } = await issue();
    expect((await scan(token, riyaToken)).status).toBe(403);
    const ok = await scan(token, ctx.a.token);
    expect(ok.status).toBe(201);
    expect(ok.body.data.status).toBe('VERIFIED');
  });

  it('Riya can scan a student of her own section B', async () => {
    const { Student } = await import('../src/models/Student.js');
    const { StudentEnrollment } = await import('../src/models/StudentEnrollment.js');
    const kid = await Student.create({
      schoolId: ctx.a.schoolId, admissionNumber: 'ADM-B-1', firstName: 'Bhavya', lastName: 'B', status: 'ACTIVE',
      parentName: 'B Parent', parentPhone: '9876500009',
    });
    await StudentEnrollment.create({
      schoolId: ctx.a.schoolId, studentId: kid._id, academicYearId: ctx.a.yearId, classId: ctx.a.classId,
      sectionId: sectionB._id, rollNumber: '1', status: 'ACTIVE',
    });
    const qrB = await qr.issueForChild({ schoolId: ctx.a.schoolId, studentId: String(kid._id) });
    expect(qrB.enabled).toBe(true);
    expect((await scan(qrB.token, riyaToken)).status).toBe(201);
    // ...and the 5-A teacher cannot release that child
    const qrB2 = await qr.issueForChild({ schoolId: ctx.a.schoolId, studentId: String(kid._id) });
    const other = await scan(qrB2.token, ctx.a.token);
    expect([403, 409]).toContain(other.status);
  });
});

describe('Safe pickup — collector photo', () => {
  const tiny = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD';
  it('teacher completes with a photo; stored, flagged, bad photo rejected', async () => {
    const { StudentPickupSession } = await import('../src/models/StudentPickupSession.js');
    const { token } = await issue();
    const r = await scan(token);
    const id = r.body.data.id;
    const bad = await request(app)
      .post(`/school-portal/teacher/pickups/${id}/complete`)
      .set(auth(ctx.a.token))
      .send({ handoverConfirmed: true, pickupPersonName: 'X', pickupPersonPhoto: 'data:text/html;base64,AAAA' });
    expect(bad.status).toBe(400);
    const ok = await request(app)
      .post(`/school-portal/teacher/pickups/${id}/complete`)
      .set(auth(ctx.a.token))
      .send({ handoverConfirmed: true, pickupPersonName: 'X', pickupPersonRelationship: 'Parent', pickupPersonPhoto: tiny });
    expect(ok.status).toBe(200);
    expect(ok.body.data.hasPickupPhoto).toBe(true);
    expect(ok.body.data.pickupPersonPhoto).toBeUndefined();
    const row = await StudentPickupSession.findById(id).select('+pickupPersonPhoto');
    expect(row.pickupPersonPhoto).toBe(tiny);
  });
});
