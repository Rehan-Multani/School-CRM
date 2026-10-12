import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { distanceMeters } from '../src/utils/geo.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

// School gate used by the tests; ~0.0009 deg of latitude is ~100 m.
const SCHOOL = { latitude: 23.2599, longitude: 77.4126 };
const AT_SCHOOL = { ...SCHOOL, accuracy: 12, biometricVerified: true };
const FAR = { latitude: SCHOOL.latitude + 0.01, longitude: SCHOOL.longitude, accuracy: 10, biometricVerified: true }; // ~1.1 km

const saveGeofence = (body) =>
  request(app).put('/school-portal/settings/attendance-geofence').set(auth(ctx.a.adminToken)).send(body);
const checkIn = (token, body) =>
  request(app).post('/school-portal/teacher/self-attendance/check-in').set(auth(token)).send(body);
const checkOut = (token, body) =>
  request(app).post('/school-portal/teacher/self-attendance/check-out').set(auth(token)).send(body);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('geo.distanceMeters', () => {
  it('is ~0 for the same point and ~111 km per degree of latitude', () => {
    expect(distanceMeters(10, 10, 10, 10)).toBe(0);
    const d = distanceMeters(10, 10, 11, 10);
    expect(d).toBeGreaterThan(110000);
    expect(d).toBeLessThan(112500);
  });
});

describe('Admin attendance location', () => {
  it('rejects enabling without a location', async () => {
    const res = await saveGeofence({ enabled: true });
    expect(res.status).toBe(400);
  });

  it('rejects an out-of-range radius and invalid coordinates', async () => {
    expect((await saveGeofence({ ...SCHOOL, radiusMeters: 5 })).status).toBe(400);
    expect((await saveGeofence({ ...SCHOOL, radiusMeters: 99999 })).status).toBe(400);
    expect((await saveGeofence({ latitude: 123, longitude: 10, radiusMeters: 100 })).status).toBe(400);
  });

  it('saves and reads back the location', async () => {
    const res = await saveGeofence({ enabled: true, ...SCHOOL, radiusMeters: 150, label: 'Main campus', requireBiometric: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ enabled: true, radiusMeters: 150, label: 'Main campus', requireBiometric: true });

    const get = await request(app).get('/school-portal/settings/attendance-geofence').set(auth(ctx.a.adminToken));
    expect(get.body.data.latitude).toBeCloseTo(SCHOOL.latitude, 5);
  });

  it('is not reachable by a teacher token', async () => {
    const res = await request(app).get('/school-portal/settings/attendance-geofence').set(auth(ctx.a.token));
    expect([401, 403]).toContain(res.status);
  });
});

describe('Teacher self attendance', () => {
  it('does not expose the school coordinates to the teacher', async () => {
    const res = await request(app).get('/school-portal/teacher/self-attendance/today').set(auth(ctx.a.token));
    expect(res.status).toBe(200);
    expect(res.body.data.config).toMatchObject({ enabled: true, radiusMeters: 150 });
    expect(JSON.stringify(res.body)).not.toContain(String(SCHOOL.latitude));
    expect(res.body.data.record).toBeNull();
  });

  it('refuses without the fingerprint claim', async () => {
    const res = await checkIn(ctx.a.token, { ...AT_SCHOOL, biometricVerified: false });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BIOMETRIC_REQUIRED');
  });

  it('refuses a mocked location and a weak GPS fix', async () => {
    const mocked = await checkIn(ctx.a.token, { ...AT_SCHOOL, mocked: true });
    expect(mocked.status).toBe(403);
    expect(mocked.body.code).toBe('LOCATION_UNRELIABLE');

    const weak = await checkIn(ctx.a.token, { ...AT_SCHOOL, accuracy: 400 });
    expect(weak.status).toBe(409);
    expect(weak.body.code).toBe('LOCATION_UNRELIABLE');
  });

  it('refuses a check in outside the radius and records nothing', async () => {
    const res = await checkIn(ctx.a.token, FAR);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('OUTSIDE_GEOFENCE');
    const today = await request(app).get('/school-portal/teacher/self-attendance/today').set(auth(ctx.a.token));
    expect(today.body.data.record).toBeNull();
  });

  it('refuses check out before check in', async () => {
    const res = await checkOut(ctx.a.token, AT_SCHOOL);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('NOT_CHECKED_IN');
  });

  it('checks in inside the radius and writes a StaffAttendance row', async () => {
    const res = await checkIn(ctx.a.token, AT_SCHOOL);
    expect(res.status).toBe(200);
    expect(res.body.data.alreadyDone).toBe(false);
    expect(res.body.data.record).toMatchObject({ status: 'PRESENT', checkedIn: true, checkedOut: false, method: 'APP_GEOFENCE' });

    const { StaffAttendance } = await import('../src/models/StaffAttendance.js');
    const rows = await StaffAttendance.find({ schoolId: ctx.a.schoolId, employeeRefId: ctx.a.teacherId });
    expect(rows).toHaveLength(1);
    expect(rows[0].employeeType).toBe('TEACHER');
    expect(rows[0].checkInGeo.biometricVerified).toBe(true);
  });

  it('is idempotent: a second check in does not create a second row', async () => {
    const res = await checkIn(ctx.a.token, AT_SCHOOL);
    expect(res.status).toBe(200);
    expect(res.body.data.alreadyDone).toBe(true);
    const { StaffAttendance } = await import('../src/models/StaffAttendance.js');
    expect(await StaffAttendance.countDocuments({ schoolId: ctx.a.schoolId, employeeRefId: ctx.a.teacherId })).toBe(1);
  });

  it('checks out inside the radius, but not outside it', async () => {
    const far = await checkOut(ctx.a.token, FAR);
    expect(far.status).toBe(403);
    const ok = await checkOut(ctx.a.token, AT_SCHOOL);
    expect(ok.status).toBe(200);
    expect(ok.body.data.record.checkedOut).toBe(true);
  });

  it('is blocked when the school has not enabled it', async () => {
    await saveGeofence({ enabled: false });
    const res = await checkIn(ctx.b.token, AT_SCHOOL);
    expect([409, 404]).toContain(res.status);
  });

  it('does not let a teacher in another school use this school\'s radius', async () => {
    // School B never configured a location, so the same coordinates must not work there.
    const res = await checkIn(ctx.b.token, AT_SCHOOL);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('GEOFENCE_NOT_CONFIGURED');
  });
});
