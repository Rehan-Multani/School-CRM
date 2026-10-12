/**
 * Self attendance, part 2: the Principal + School Admin are notified each time
 * a teacher / transport manager marks present, and the transport manager gets
 * the same radius + fingerprint rules as a teacher.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { SchoolUser } from '../src/models/SchoolUser.js';
import { School } from '../src/models/School.js';
import { PlatformNotification } from '../src/models/PlatformNotification.js';
import { StaffAttendance } from '../src/models/StaffAttendance.js';

let app;
let ctx;
let slug;
let managerToken;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

const SCHOOL = { latitude: 23.2599, longitude: 77.4126 };
const AT_SCHOOL = { ...SCHOOL, accuracy: 10, biometricVerified: true };
const FAR = { latitude: SCHOOL.latitude + 0.01, longitude: SCHOOL.longitude, accuracy: 10, biometricVerified: true };
const M = '/school-portal/transport-manager';

const officeNotes = (needle) => PlatformNotification.find({ schoolId: slug, audiences: 'principal', title: new RegExp(needle) }).lean();
async function waitFor(fn, ms = 2000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v.length || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
}

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  slug = (await School.findById(ctx.a.schoolId).select('schoolId').lean()).schoolId;

  await request(app)
    .put('/school-portal/settings/attendance-geofence')
    .set(auth(ctx.a.adminToken))
    .send({ enabled: true, ...SCHOOL, radiusMeters: 150, requireBiometric: true });

  await SchoolUser.create({
    schoolId: ctx.a.schoolId, employeeId: 'TM-9', firstName: 'Manish', lastName: 'Dave', name: 'Manish Dave',
    email: 'tm.self@schoola.edu', role: 'TRANSPORT', phone: '9811200009', status: 'ACTIVE', designation: 'Transport Manager',
    passwordHash: await bcrypt.hash('Manager@1', 10),
  });
  const login = await request(app).post('/school-portal/auth/transport-login').send({ identifier: 'tm.self@schoola.edu', password: 'Manager@1' });
  managerToken = login.body.token;
}, 60000);
afterAll(disconnect);

describe('Teacher marks present -> principal + admin are notified', () => {
  it('creates one office notification per mark, none for a repeat', async () => {
    const res = await request(app).post('/school-portal/teacher/self-attendance/check-in').set(auth(ctx.a.token)).send(AT_SCHOOL);
    expect(res.status).toBe(200);

    const notes = await waitFor(() => officeNotes('Teacher present'));
    expect(notes).toHaveLength(1);
    expect(notes[0].audiences).toEqual(expect.arrayContaining(['principal', 'school-admin']));
    expect(notes[0].recipientRefIds).toEqual([]);
    expect(notes[0].title).toContain('Test Teacher');
    expect(notes[0].link.type).toBe('staff_attendance');

    await request(app).post('/school-portal/teacher/self-attendance/check-in').set(auth(ctx.a.token)).send(AT_SCHOOL);
    await new Promise((r) => setTimeout(r, 150));
    expect(await officeNotes('Teacher present')).toHaveLength(1);
  });

  it('does not notify when the mark is refused (outside the radius)', async () => {
    const before = (await PlatformNotification.countDocuments({ schoolId: slug }));
    const res = await request(app).post('/school-portal/teacher/self-attendance/check-in').set(auth(ctx.b.token)).send(FAR);
    expect([403, 409]).toContain(res.status);
    await new Promise((r) => setTimeout(r, 150));
    expect(await PlatformNotification.countDocuments({ schoolId: slug })).toBe(before);
  });

  it('shows up in the principal inbox', async () => {
    const { signAccessToken } = await import('../../shared/generateToken.js');
    const { env } = await import('../src/config/env.js');
    const token = signAccessToken(
      { sub: 'p1', userId: 'p1', role: 'PRINCIPAL', schoolId: ctx.a.schoolId, name: 'Principal' },
      { secret: env.jwtSecret, expiresIn: '1h' },
    );
    const res = await request(app).get('/notifications/inbox').set(auth(token));
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).toContain('Teacher present');
  });
});

describe('Transport manager self attendance', () => {
  it('is refused outside the radius and without the fingerprint', async () => {
    const far = await request(app).post(`${M}/self-attendance/check-in`).set(auth(managerToken)).send(FAR);
    expect(far.status).toBe(403);
    expect(far.body.code).toBe('OUTSIDE_GEOFENCE');

    const noBio = await request(app).post(`${M}/self-attendance/check-in`).set(auth(managerToken)).send({ ...AT_SCHOOL, biometricVerified: false });
    expect(noBio.status).toBe(400);
    expect(noBio.body.code).toBe('BIOMETRIC_REQUIRED');
  });

  it('marks present inside the radius as STAFF and notifies the office', async () => {
    const today = await request(app).get(`${M}/self-attendance/today`).set(auth(managerToken));
    expect(today.status).toBe(200);
    expect(today.body.data.config.enabled).toBe(true);
    expect(today.body.data.record).toBeNull();

    const res = await request(app).post(`${M}/self-attendance/check-in`).set(auth(managerToken)).send(AT_SCHOOL);
    expect(res.status).toBe(200);
    expect(res.body.data.record).toMatchObject({ status: 'PRESENT', checkedIn: true, method: 'APP_GEOFENCE' });

    const row = await StaffAttendance.findOne({ schoolId: ctx.a.schoolId, employeeId: 'TM-9' });
    expect(row.employeeType).toBe('STAFF');
    expect(row.employeeRole).toBe('Transport Manager');

    const notes = await waitFor(() => officeNotes('Transport Manager present'));
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toContain('Manish Dave');
  });

  it('is idempotent and needs a manager token', async () => {
    const again = await request(app).post(`${M}/self-attendance/check-in`).set(auth(managerToken)).send(AT_SCHOOL);
    expect(again.status).toBe(200);
    expect(again.body.data.alreadyDone).toBe(true);
    expect(await StaffAttendance.countDocuments({ schoolId: ctx.a.schoolId, employeeId: 'TM-9' })).toBe(1);

    const teacherToken = await request(app).get(`${M}/self-attendance/today`).set(auth(ctx.a.token));
    expect([401, 403]).toContain(teacherToken.status);
  });
});
