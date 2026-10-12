/**
 * A teacher can save / edit STUDENT attendance only from inside the school
 * radius (when the school turned the radius on and left "student attendance
 * only inside this radius" enabled).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const day = (offset = 0) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);

const SCHOOL = { latitude: 23.2599, longitude: 77.4126 };
const INSIDE = { ...SCHOOL, accuracy: 10 };
const OUTSIDE = { latitude: SCHOOL.latitude + 0.01, longitude: SCHOOL.longitude, accuracy: 10 };

const geofence = (body) =>
  request(app).put('/school-portal/settings/attendance-geofence').set(auth(ctx.a.adminToken)).send(body);
const submit = (date, location, status = 'PRESENT') =>
  request(app)
    .post('/school-portal/teacher/attendance')
    .set(auth(ctx.a.token))
    .send({
      sectionId: ctx.a.sectionId,
      date,
      records: [{ studentId: ctx.a.studentId, status }],
      ...(location ? { location } : {}),
    });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Student attendance + school radius', () => {
  it('is unrestricted while the school has not enabled the radius', async () => {
    const res = await submit(day(3));
    expect(res.status).toBe(200);
  });

  it('asks for the location once the radius is on', async () => {
    const set = await geofence({ enabled: true, ...SCHOOL, radiusMeters: 150, studentAttendanceInRadius: true });
    expect(set.status).toBe(200);
    expect(set.body.data.studentAttendanceInRadius).toBe(true);

    const res = await submit(day(0));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('LOCATION_REQUIRED');
  });

  it('refuses a save from outside the radius, and a mocked / weak fix', async () => {
    const far = await submit(day(0), OUTSIDE);
    expect(far.status).toBe(403);
    expect(far.body.code).toBe('OUTSIDE_GEOFENCE');
    expect(far.body.message).toContain('Student attendance');

    const mocked = await submit(day(0), { ...INSIDE, mocked: true });
    expect(mocked.status).toBe(403);
    expect(mocked.body.code).toBe('LOCATION_UNRELIABLE');

    const weak = await submit(day(0), { ...INSIDE, accuracy: 500 });
    expect(weak.status).toBe(409);
  });

  it('saves inside the radius', async () => {
    const res = await submit(day(0), INSIDE);
    expect(res.status).toBe(200);
    expect(res.body.data.entries[0].status).toBe('PRESENT');
  });

  it('applies the same rule when editing an existing day', async () => {
    const sheet = await submit(day(0), INSIDE); // idempotent re-save returns the record
    const id = sheet.body.data.id;

    const noFix = await request(app)
      .patch(`/school-portal/teacher/attendance/${id}`)
      .set(auth(ctx.a.token))
      .send({ records: [{ studentId: ctx.a.studentId, status: 'ABSENT' }] });
    expect(noFix.status).toBe(400);
    expect(noFix.body.code).toBe('LOCATION_REQUIRED');

    const far = await request(app)
      .patch(`/school-portal/teacher/attendance/${id}`)
      .set(auth(ctx.a.token))
      .send({ records: [{ studentId: ctx.a.studentId, status: 'ABSENT' }], location: OUTSIDE });
    expect(far.status).toBe(403);

    const ok = await request(app)
      .patch(`/school-portal/teacher/attendance/${id}`)
      .set(auth(ctx.a.token))
      .send({ records: [{ studentId: ctx.a.studentId, status: 'ABSENT' }], location: INSIDE });
    expect(ok.status).toBe(200);
  });

  it('can be switched off separately from teacher self attendance', async () => {
    const set = await geofence({ enabled: true, ...SCHOOL, radiusMeters: 150, studentAttendanceInRadius: false });
    expect(set.status).toBe(200);
    const res = await submit(day(1));
    expect(res.status).toBe(200);
  });

  it('does not apply to another school that never set a radius', async () => {
    const res = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.b.token))
      .send({ sectionId: ctx.b.sectionId, date: day(0), records: [{ studentId: ctx.b.studentId, status: 'PRESENT' }] });
    expect(res.status).toBe(200);
  });
});
