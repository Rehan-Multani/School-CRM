import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let TransportDailyStatus;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const kidA = () => `/school-portal/parent/children/${ctx.a.studentId}`;
const today = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  TransportDailyStatus = (await import('../src/models/TransportDailyStatus.js')).TransportDailyStatus;
  // Two daily rows for child A: today (picked up only) and an older day (both legs).
  await TransportDailyStatus.create([
    {
      schoolId: ctx.a.schoolId, studentId: ctx.a.studentId, routeId: ctx.a.routeId, stopId: ctx.a.stopId,
      driverId: ctx.a.driverId, date: today(), pickupStatus: 'PICKED_UP', pickedUpAt: new Date(),
    },
    {
      schoolId: ctx.a.schoolId, studentId: ctx.a.studentId, routeId: ctx.a.routeId, stopId: ctx.a.stopId,
      driverId: ctx.a.driverId, date: '2020-01-15', pickupStatus: 'PICKED_UP', pickedUpAt: new Date('2020-01-15T02:00:00Z'),
      dropStatus: 'DROPPED', droppedAt: new Date('2020-01-15T10:00:00Z'),
    },
  ]);
}, 60000);
afterAll(disconnect);

describe('Parent APK — transport for the linked child (read-only)', () => {
  it('assigned child returns route + vehicle + driver + stop + today + ordered stops', async () => {
    const res = await request(app).get(`${kidA()}/transport`).set(auth(ctx.a.parentToken));
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.assigned).toBe(true);
    expect(d.route.id).toBe(ctx.a.routeId);
    expect(d.route.name).toBe('Route 01');
    expect(d.route.vehicle).toEqual({ number: 'MP09AA1234', type: 'SCHOOL_BUS', capacity: 40 });
    expect(d.route.driver).toEqual({ name: 'Rahul Sharma', mobile: '9876543210' });
    expect(d.stop).toEqual({ id: ctx.a.stopId, name: 'Teen Imli', pickupTime: '07:30 AM', dropTime: '04:00 PM', sequenceOrder: 1 });
    expect(d.today.date).toBe(today());
    expect(d.today.pickup.done).toBe(true);
    expect(d.today.pickup.at).toBeTruthy();
    expect(d.today.drop.done).toBe(false);
    expect(d.today.drop.at).toBeNull();
    expect(d.stops.map((s) => s.sequenceOrder)).toEqual([1, 2]);
    expect(d.stops.map((s) => s.isMine)).toEqual([true, false]);
  });

  it('history lists daily rows newest first, with from/to filtering and pagination', async () => {
    const res = await request(app).get(`${kidA()}/transport/history`).set(auth(ctx.a.parentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.map((r) => r.date)).toEqual([today(), '2020-01-15']);
    expect(res.body.data[1]).toMatchObject({ pickup: { done: true }, drop: { done: true } });
    expect(res.body.pagination).toMatchObject({ page: 1, total: 2, totalPages: 1 });

    const old = await request(app).get(`${kidA()}/transport/history?from=2020-01-01&to=2020-01-31`).set(auth(ctx.a.parentToken));
    expect(old.body.data.map((r) => r.date)).toEqual(['2020-01-15']);
  });

  it('unassigned child → 200 with assigned:false (not 404)', async () => {
    const { StudentTransportAssignment } = await import('../src/models/StudentTransportAssignment.js');
    await StudentTransportAssignment.updateOne(
      { schoolId: ctx.b.schoolId, studentId: ctx.b.studentId, status: 'ACTIVE' },
      { $set: { status: 'DISCONTINUED' } }
    );
    const res = await request(app)
      .get(`/school-portal/parent/children/${ctx.b.studentId}/transport`)
      .set(auth(ctx.b.parentToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ assigned: false });
  });

  it('cross-school / unlinked child → 403 CHILD_ACCESS_DENIED', async () => {
    for (const path of [
      `/school-portal/parent/children/${ctx.b.studentId}/transport`,
      `/school-portal/parent/children/${ctx.b.studentId}/transport/history`,
      `/school-portal/parent/children/${ctx.a.studentNoGuardianId}/transport`,
    ]) {
      const res = await request(app).get(path).set(auth(ctx.a.parentToken));
      expect(res.status, path).toBe(403);
      expect(res.body.code, path).toBe('CHILD_ACCESS_DENIED');
    }
  });

  it('requires a parent token (401 / 403)', async () => {
    expect((await request(app).get(`${kidA()}/transport`)).status).toBe(401);
    expect((await request(app).get(`${kidA()}/transport`).set(auth(ctx.a.token))).status).toBe(403);
  });
});

describe('Student APK — own transport (read-only)', () => {
  it('GET /school-portal/student/transport returns the same shape for the student’s own id', async () => {
    const res = await request(app).get('/school-portal/student/transport').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.assigned).toBe(true);
    expect(res.body.data.route.id).toBe(ctx.a.routeId);
    expect(res.body.data.stop.id).toBe(ctx.a.stopId);
    expect(res.body.data.today.pickup.done).toBe(true);
  });

  it('GET /school-portal/student/transport/history is scoped to the student', async () => {
    const res = await request(app).get('/school-portal/student/transport/history').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(2);

    const other = await request(app).get('/school-portal/student/transport/history').set(auth(ctx.b.studentToken));
    expect(other.body.data).toEqual([]);
  });
});
