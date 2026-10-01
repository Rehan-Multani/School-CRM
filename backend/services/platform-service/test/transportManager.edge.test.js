/**
 * Transport Manager app — the edges around the happy path covered in
 * transportManager.test.js: bad input, sessions, a route that stops being
 * ready, riders who leave or change route, races, tenancy and the paywall.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { signAccessToken } from '../../shared/generateToken.js';
import { env } from '../src/config/env.js';
import { SchoolUser } from '../src/models/SchoolUser.js';
import { Vehicle } from '../src/models/Vehicle.js';
import { Driver } from '../src/models/Driver.js';
import { TransportRoute } from '../src/models/TransportRoute.js';
import { RouteStop } from '../src/models/RouteStop.js';
import { StudentTransportAssignment } from '../src/models/StudentTransportAssignment.js';
import { TransportDailyStatus } from '../src/models/TransportDailyStatus.js';
import { SchoolSubscription } from '../src/models/SchoolSubscription.js';
import { userService } from '../src/services/user.service.js';
import { todayStr } from '../src/utils/transportTime.js';

let app;
let ctx;
let token; // school A manager
let tokenB; // school B manager
let managerA;

const EMAIL = 'fleet@schoola.edu';
const EMAIL_B = 'fleet@schoolb.edu';
const PASSWORD = 'Manager@1';
const M = '/school-portal/transport-manager';
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = (body, path = '/school-portal/auth/transport-login') => request(app).post(path).send(body);
const get = (path, t = token) => request(app).get(`${M}${path}`).set(auth(t));
const mark = (verb, leg, studentId, body, t = token) =>
  request(app)[verb](`${M}/students/${studentId}/${leg}`).set(auth(t)).send(body);

function ymdDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function createManager(c, email, employeeId) {
  return SchoolUser.create({
    schoolId: c.schoolId, employeeId, firstName: 'Farida', lastName: 'Khan', name: 'Farida Khan',
    email, role: 'TRANSPORT', phone: '9811200002', status: 'ACTIVE', designation: 'Transport Manager',
    passwordHash: await bcrypt.hash(PASSWORD, 10),
  });
}

const clearDay = () => TransportDailyStatus.deleteMany({});

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  managerA = await createManager(ctx.a, EMAIL, 'TM-A-7');
  await createManager(ctx.b, EMAIL_B, 'TM-B-7');
  token = (await login({ identifier: EMAIL, password: PASSWORD })).body.token;
  tokenB = (await login({ identifier: EMAIL_B, password: PASSWORD })).body.token;
}, 60000);
afterAll(disconnect);

describe('Transport manager edges · sign-in', () => {
  it('needs both fields', async () => {
    // (Kept to two: every sign-in in this file draws on one 20-per-window login budget.)
    for (const body of [{ identifier: EMAIL }, { identifier: '   ', password: PASSWORD }]) {
      const res = await login(body);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('TRANSPORT_VALIDATION_ERROR');
    }
  });

  it('accepts the email in any case, the employee ID, and the short auth path', async () => {
    const shouting = await login({ identifier: `  ${EMAIL.toUpperCase()} `, password: PASSWORD });
    expect(shouting.status).toBe(200);
    const byEmployeeId = await login({ identifier: 'tm-a-7', password: PASSWORD });
    expect(byEmployeeId.status).toBe(200);
    expect(byEmployeeId.body.user.email).toBe(EMAIL);
    const alias = await login({ email: EMAIL, password: PASSWORD }, '/school-auth/transport-login');
    expect(alias.status).toBe(200);
  });

  it('answers an unknown email exactly like a wrong password', async () => {
    const unknown = await login({ identifier: 'nobody@schoola.edu', password: PASSWORD });
    const wrong = await login({ identifier: EMAIL, password: 'Wrong@123' });
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    // An object where a string belongs is just another wrong login, not a query.
    const injected = await login({ identifier: { $ne: '' }, password: { $ne: '' } });
    expect(injected.status).toBe(401);
  });

  it('tells an inactive manager why — but only once the password is right', async () => {
    await SchoolUser.updateOne({ _id: managerA._id }, { $set: { status: 'INACTIVE' } });
    const right = await login({ identifier: EMAIL, password: PASSWORD });
    expect(right.status).toBe(403);
    expect(right.body.code).toBe('TRANSPORT_MANAGER_INACTIVE');
    const wrong = await login({ identifier: EMAIL, password: 'Wrong@123' });
    expect(wrong.status).toBe(401);
    await SchoolUser.updateOne({ _id: managerA._id }, { $set: { status: 'ACTIVE' } });
  });

  it('refuses a broken, stale or re-roled token', async () => {
    expect((await get('/me', 'not-a-jwt')).status).toBe(401);
    expect((await request(app).get(`${M}/me`).set({ Authorization: token })).status).toBe(401); // no "Bearer "

    const base = { sub: String(managerA._id), userId: String(managerA._id), schoolId: ctx.a.schoolId, role: 'TRANSPORT' };
    const sign = (payload) => signAccessToken(payload, { secret: env.jwtSecret, expiresIn: '1h' });
    expect((await get('/me', sign({ ...base, tv: 99 }))).status).toBe(401); // token version that was never issued
    expect((await get('/me', sign({ ...base, schoolId: ctx.b.schoolId, tv: 0 }))).status).toBe(401); // right user, wrong school
    // A real staff member of another role cannot dress up as the manager.
    const hr = await SchoolUser.create({
      schoolId: ctx.a.schoolId, employeeId: 'HR-9', firstName: 'Hema', lastName: 'Rao', name: 'Hema Rao',
      email: 'hr@schoola.edu', role: 'HR', status: 'ACTIVE', passwordHash: await bcrypt.hash(PASSWORD, 10),
    });
    expect((await get('/me', sign({ ...base, sub: String(hr._id), userId: String(hr._id), tv: 0 }))).status).toBe(401);
    expect((await login({ identifier: 'hr@schoola.edu', password: PASSWORD })).status).toBe(401);
  });
});

describe('Transport manager edges · input', () => {
  it('rejects malformed ids and dates before touching data', async () => {
    expect((await get('/routes/not-an-id')).status).toBe(400);
    expect((await mark('post', 'pickup', 'not-an-id')).status).toBe(400);
    expect((await get(`/routes/${new mongoose.Types.ObjectId()}`)).status).toBe(404);
    expect((await mark('post', 'pickup', String(new mongoose.Types.ObjectId()))).status).toBe(404);

    for (const date of ['01-10-2026', '2026-1-5', '2026-02-31', '2026-13-01', 'yesterday']) {
      const overview = await get(`/overview?date=${date}`);
      expect(overview.status, `overview ${date}`).toBe(400);
      expect(overview.body.code).toBe('TRANSPORT_VALIDATION_ERROR');
      expect((await get(`/routes/${ctx.a.routeId}?date=${date}`)).status, `route ${date}`).toBe(400);
      expect((await mark('post', 'pickup', ctx.a.studentId, { date })).status, `mark ${date}`).toBe(400);
    }
    expect(await TransportDailyStatus.countDocuments({})).toBe(0);
  });

  it('refuses tomorrow on every write, including an undo', async () => {
    const tomorrow = ymdDaysAgo(-1);
    for (const leg of ['pickup', 'drop']) {
      expect((await mark('post', leg, ctx.a.studentId, { date: tomorrow })).status).toBe(400);
      const undo = await request(app).delete(`${M}/students/${ctx.a.studentId}/${leg}?date=${tomorrow}`).set(auth(token));
      expect(undo.status).toBe(400);
    }
  });
});

describe('Transport manager edges · the daily run', () => {
  it('an undo with nothing to undo is a quiet no-op', async () => {
    await clearDay();
    for (const leg of ['pickup', 'drop']) {
      const res = await mark('delete', leg, ctx.a.studentId);
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/was not marked/);
      expect(res.body.data).toBeNull();
    }
    expect(await TransportDailyStatus.countDocuments({})).toBe(0);
  });

  it('a past day is its own record and leaves today alone', async () => {
    await clearDay();
    const yesterday = ymdDaysAgo(1);
    const res = await mark('post', 'pickup', ctx.a.studentId, { date: yesterday });
    expect(res.status).toBe(200);
    expect(res.body.data.date).toBe(yesterday);

    expect((await get(`/overview?date=${yesterday}`)).body.data.totals.pickedUp).toBe(1);
    const today = await get('/overview');
    expect(today.body.data.date).toBe(todayStr());
    expect(today.body.data.totals.pickedUp).toBe(0);
    expect((await get(`/routes/${ctx.a.routeId}`)).body.data.students[0].pickupStatus).toBe('PENDING');

    // The undo carries its date in the query string.
    const undo = await request(app).delete(`${M}/students/${ctx.a.studentId}/pickup?date=${yesterday}`).set(auth(token));
    expect(undo.body.data.pickupStatus).toBe('PENDING');
  });

  it('two taps at the same instant make one row, not an error', async () => {
    await clearDay();
    const results = await Promise.all(Array.from({ length: 6 }, () => mark('post', 'pickup', ctx.a.studentId)));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200, 200, 200]);
    expect(await TransportDailyStatus.countDocuments({ studentId: ctx.a.studentId })).toBe(1);
  });

  it('records who tapped, and whose bus it was', async () => {
    const row = await TransportDailyStatus.findOne({ studentId: ctx.a.studentId, date: todayStr() });
    expect(String(row.markedByUserId)).toBe(String(managerA._id));
    expect(String(row.driverId)).toBe(ctx.a.driverId);
    expect(String(row.routeId)).toBe(ctx.a.routeId);
    expect(String(row.stopId)).toBe(ctx.a.stopId);
  });

  it('a route that loses its driver or its bus stops taking marks', async () => {
    await clearDay();
    for (const field of ['driverId', 'vehicleId']) {
      const original = (await TransportRoute.findById(ctx.a.routeId))[field];
      await TransportRoute.updateOne({ _id: ctx.a.routeId }, { $set: { [field]: null } });

      const overview = await get('/overview');
      expect(overview.body.data.routes[0].ready, field).toBe(false);
      const run = await get(`/routes/${ctx.a.routeId}`);
      expect(run.status).toBe(200);
      expect(run.body.data.ready).toBe(false);
      expect(run.body.data.students).toHaveLength(1); // still listed, just not markable

      const res = await mark('post', 'pickup', ctx.a.studentId);
      expect(res.status, field).toBe(409);
      expect(res.body.code).toBe('TRANSPORT_ROUTE_NOT_READY');

      await TransportRoute.updateOne({ _id: ctx.a.routeId }, { $set: { [field]: original } });
    }
    expect(await TransportDailyStatus.countDocuments({})).toBe(0);
    expect((await mark('post', 'pickup', ctx.a.studentId)).status).toBe(200);
  });

  it('a rider moved to another route keeps the morning pickup there', async () => {
    // Picked up on Route 01 by the previous test; the office now moves them.
    const vehicle = await Vehicle.create({ schoolId: ctx.a.schoolId, vehicleNumber: 'MP09AA9999', vehicleType: 'VAN', capacity: 12, status: 'ACTIVE' });
    const driver = await Driver.create({ schoolId: ctx.a.schoolId, name: 'Deepak Jain', mobile: '9876543299', licenseNumber: 'MP000000099', vehicleId: vehicle._id, status: 'ACTIVE' });
    const route2 = await TransportRoute.create({ schoolId: ctx.a.schoolId, routeName: 'Route 02', vehicleId: vehicle._id, driverId: driver._id, status: 'ACTIVE' });
    const stop = await RouteStop.create({ schoolId: ctx.a.schoolId, routeId: route2._id, stopName: 'Palasia', sequenceOrder: 1, pickupTime: '07:45 AM', dropTime: '03:45 PM' });

    const empty = await get(`/routes/${route2._id}`);
    expect(empty.body.data).toMatchObject({ totalStudents: 0, pickedUpCount: 0, ready: true });
    expect(empty.body.data.stops).toHaveLength(1);

    await StudentTransportAssignment.updateOne(
      { studentId: ctx.a.studentId, status: 'ACTIVE' },
      { $set: { routeId: route2._id, stopId: stop._id } }
    );

    const moved = await get(`/routes/${route2._id}`);
    expect(moved.body.data.students[0]).toMatchObject({ studentId: ctx.a.studentId, pickupStatus: 'PICKED_UP' });
    expect(moved.body.data.pickedUpCount).toBe(1);
    expect((await get(`/routes/${ctx.a.routeId}`)).body.data.totalStudents).toBe(0);

    const overview = await get('/overview');
    const byName = Object.fromEntries(overview.body.data.routes.map((r) => [r.routeName, r]));
    expect(byName['Route 01']).toMatchObject({ totalStudents: 0, pickedUpCount: 0 });
    expect(byName['Route 02']).toMatchObject({ totalStudents: 1, pickedUpCount: 1 });
    expect(overview.body.data.totals).toMatchObject({ routes: 2, vehicles: 2, students: 1, pickedUp: 1 });

    // The afternoon drop goes on the new route's driver.
    const drop = await mark('post', 'drop', ctx.a.studentId);
    expect(drop.status).toBe(200);
    expect(drop.body.data.routeId).toBe(String(route2._id));
    const row = await TransportDailyStatus.findOne({ studentId: ctx.a.studentId, date: todayStr() });
    expect(String(row.driverId)).toBe(String(driver._id));
  });

  it('a rider taken off transport drops out of the day', async () => {
    await StudentTransportAssignment.updateOne({ studentId: ctx.a.studentId, status: 'ACTIVE' }, { $set: { status: 'INACTIVE' } });

    for (const [verb, leg] of [['post', 'pickup'], ['post', 'drop'], ['delete', 'drop'], ['delete', 'pickup']]) {
      const res = await mark(verb, leg, ctx.a.studentId);
      expect(res.status, `${verb} ${leg}`).toBe(404);
      expect(res.body.code).toBe('TRANSPORT_NOT_FOUND');
    }
    // Their row from this morning no longer counts towards today.
    expect((await get('/overview')).body.data.totals).toMatchObject({ students: 0, pickedUp: 0, dropped: 0 });

    await StudentTransportAssignment.updateOne(
      { studentId: ctx.a.studentId },
      { $set: { status: 'ACTIVE', routeId: ctx.a.routeId, stopId: ctx.a.stopId } }
    );
  });

  it('fleet shows an unassigned vehicle and driver as such', async () => {
    const vehicle = await Vehicle.create({ schoolId: ctx.a.schoolId, vehicleNumber: 'MP09AA0000', vehicleType: 'VAN', capacity: 8, status: 'INACTIVE' });
    await Driver.create({ schoolId: ctx.a.schoolId, name: 'Spare Driver', mobile: '9876543288', licenseNumber: 'MP000000088', status: 'ACTIVE' });

    const { data } = (await get('/fleet')).body;
    expect(data.vehicles.find((v) => v.id === String(vehicle._id))).toMatchObject({ status: 'INACTIVE', driver: null, route: null });
    expect(data.drivers.find((d) => d.name === 'Spare Driver')).toMatchObject({ vehicle: null, route: null });
    // A driver's password hash never leaves the server.
    expect(JSON.stringify(data)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });
});

describe('Transport manager edges · tenancy and the paywall', () => {
  it('sees only its own school', async () => {
    const overviewB = await get('/overview', tokenB);
    expect(overviewB.body.data.routes).toHaveLength(1);
    expect(overviewB.body.data.routes[0].id).toBe(ctx.b.routeId);
    expect(overviewB.body.data.totals.vehicles).toBe(1);

    expect((await get(`/routes/${ctx.a.routeId}`, tokenB)).status).toBe(404);
    for (const verb of ['post', 'delete']) {
      expect((await mark(verb, 'pickup', ctx.a.studentId, undefined, tokenB)).status).toBe(404);
    }
    const fleetB = await get('/fleet', tokenB);
    expect(fleetB.body.data.vehicles.map((v) => v.vehicleNumber)).toEqual(['MP09BB1234']);
  });

  it('cannot reach the school admin’s transport setup, and the admin cannot mark', async () => {
    const adminPaths = ['/school-portal/transport/vehicles', '/school-portal/transport/daily', '/school-portal/transport/assignments'];
    for (const path of adminPaths) {
      expect([401, 403], path).toContain((await request(app).get(path).set(auth(token))).status);
    }
    const create = await request(app).post('/school-portal/transport/vehicles').set(auth(token)).send({ vehicleNumber: 'X', capacity: 4 });
    expect([401, 403]).toContain(create.status);
    const adminMark = await mark('post', 'pickup', ctx.a.studentId, undefined, ctx.a.adminToken);
    expect(adminMark.status).toBe(403);
    expect(adminMark.body.code).toBe('TRANSPORT_FORBIDDEN');
  });

  it('an expired subscription blocks the buses but not the account', async () => {
    const sub = await SchoolSubscription.create({ schoolId: ctx.b.schoolId, planId: new mongoose.Types.ObjectId(), status: 'expired' });

    expect((await get('/overview', tokenB)).status).toBe(402);
    expect((await get('/fleet', tokenB)).status).toBe(402);
    expect((await mark('post', 'pickup', ctx.b.studentId, undefined, tokenB)).status).toBe(402);
    expect(await TransportDailyStatus.countDocuments({ studentId: ctx.b.studentId })).toBe(0);
    // Still able to sign in, see who they are, and sign out.
    expect((await login({ identifier: EMAIL_B, password: PASSWORD })).status).toBe(200);
    expect((await get('/me', tokenB)).status).toBe(200);

    await SchoolSubscription.deleteOne({ _id: sub._id });
    expect((await get('/overview', tokenB)).status).toBe(200);
  });
});

describe('Transport manager edges · account', () => {
  it('a failed password change changes nothing', async () => {
    const change = (body) => request(app).patch(`${M}/change-password`).set(auth(token)).send(body);

    const missing = await change({ newPassword: 'Another@123' });
    expect(missing.status).toBe(400);
    const short = await change({ currentPassword: PASSWORD, newPassword: 'short' });
    expect(short.status).toBe(400);
    const wrong = await change({ currentPassword: 'Wrong@123', newPassword: 'Another@123' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe('CURRENT_PASSWORD_INVALID');

    expect((await get('/me')).status).toBe(200); // same session still good
    const stored = await SchoolUser.findById(managerA._id).select('+passwordHash');
    expect(await bcrypt.compare(PASSWORD, stored.passwordHash)).toBe(true);
  });

  it('logout ends the session on every device', async () => {
    const second = (await login({ identifier: EMAIL, password: PASSWORD })).body.token;
    const out = await request(app).post(`${M}/auth/logout`).set(auth(token));
    expect(out.status).toBe(200);
    expect((await get('/me')).status).toBe(401);
    expect((await get('/overview', second)).status).toBe(401);
    expect((await request(app).post(`${M}/auth/logout`).set(auth(token))).status).toBe(401);

    token = (await login({ identifier: EMAIL, password: PASSWORD })).body.token;
    expect((await get('/me')).status).toBe(200);
  });

  it('delete account with a wrong password is refused; the office can reopen a deleted login', async () => {
    const del = (body) => request(app).post(`${M}/account/delete`).set(auth(token)).send(body);
    const wrong = await del({ password: 'Wrong@123' });
    expect(wrong.status).toBe(401);
    expect((await get('/me')).status).toBe(200);

    expect((await del({ password: PASSWORD })).status).toBe(200);
    expect((await get('/me')).status).toBe(401);
    expect((await login({ identifier: EMAIL, password: PASSWORD })).status).toBe(401);
    // What they recorded stays on the school's books.
    expect(await TransportDailyStatus.countDocuments({ markedByUserId: managerA._id })).toBeGreaterThan(0);

    await userService.changeUserPassword(ctx.a.schoolId, String(managerA._id), 'Reopened@1');
    const back = await login({ identifier: EMAIL, password: 'Reopened@1' });
    expect(back.status).toBe(200);
    expect((await get('/overview', back.body.token)).status).toBe(200);
    expect((await SchoolUser.findById(managerA._id)).appAccountDeletedAt).toBeNull();
  });
});
