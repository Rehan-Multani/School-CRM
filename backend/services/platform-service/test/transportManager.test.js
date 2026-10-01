/**
 * The Transport Manager app: a staff account (SchoolUser, role TRANSPORT) that
 * signs in with email + password, sees every route of its own school, and
 * records — or corrects — each rider's daily pickup / drop.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { SchoolUser } from '../src/models/SchoolUser.js';
import { smsService } from '../src/services/sms.service.js';

let app;
let ctx;
let token;

const EMAIL = 'transport@schoola.edu';
const PASSWORD = 'Manager@1';
const M = '/school-portal/transport-manager';
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const login = (identifier, password) =>
  request(app).post('/school-portal/auth/transport-login').send({ identifier, password });

async function createManager(c, email) {
  return SchoolUser.create({
    schoolId: c.schoolId, employeeId: 'TM-1', firstName: 'Manish', lastName: 'Dave', name: 'Manish Dave',
    email, role: 'TRANSPORT', phone: '9811200001', status: 'ACTIVE', designation: 'Transport Manager',
    passwordHash: await bcrypt.hash(PASSWORD, 10),
  });
}

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  await createManager(ctx.a, EMAIL);
  await createManager(ctx.b, 'transport@schoolb.edu');
}, 60000);
afterAll(disconnect);
afterEach(() => vi.restoreAllMocks());

describe('Transport manager · auth', () => {
  it('signs in with email + password', async () => {
    const res = await login(EMAIL, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('TRANSPORT');
    expect(res.body.user.email).toBe(EMAIL);
    expect(res.body.school.id).toBe(ctx.a.schoolId);
    token = res.body.token;

    const me = await request(app).get(`${M}/me`).set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.data.user.name).toBe('Manish Dave');
  });

  it('rejects a wrong password, and an employee ID shared by two schools', async () => {
    const wrong = await login(EMAIL, 'nope-nope');
    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe('TRANSPORT_INVALID_CREDENTIALS');

    const ambiguous = await login('TM-1', PASSWORD);
    expect(ambiguous.status).toBe(409);
  });

  it('is its own role: other tokens are refused here, and this token elsewhere', async () => {
    for (const other of [ctx.a.token, ctx.a.driverToken, ctx.a.studentToken]) {
      const res = await request(app).get(`${M}/overview`).set(auth(other));
      expect(res.status).toBe(403);
    }
    const asDriver = await request(app).get('/school-portal/driver/route').set(auth(token));
    expect(asDriver.status).toBe(403);
    const asAdmin = await request(app).get('/school-portal/transport/vehicles').set(auth(token));
    expect([401, 403]).toContain(asAdmin.status);
    const anonymous = await request(app).get(`${M}/overview`);
    expect(anonymous.status).toBe(401);
  });
});

describe('Transport manager · routes, fleet and the daily run', () => {
  const mark = (verb, leg, studentId, body) =>
    request(app)[verb](`${M}/students/${studentId}/${leg}`).set(auth(token)).send(body);

  it('overview lists every route of the school with the day’s progress', async () => {
    const res = await request(app).get(`${M}/overview`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.routes).toHaveLength(1);
    const [route] = res.body.data.routes;
    expect(route.id).toBe(ctx.a.routeId);
    expect(route).toMatchObject({ routeName: 'Route 01', ready: true, totalStops: 2, totalStudents: 1, pickedUpCount: 0 });
    expect(route.driver.name).toBe('Rahul Sharma');
    expect(res.body.data.totals).toMatchObject({ routes: 1, vehicles: 1, drivers: 1, students: 1, pickedUp: 0, dropped: 0 });
  });

  it('route run returns the stops and the riders, and never another school’s route', async () => {
    const res = await request(app).get(`${M}/routes/${ctx.a.routeId}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.stops.map((s) => s.stopName)).toEqual(['Teen Imli', 'School']);
    expect(res.body.data.students).toHaveLength(1);
    expect(res.body.data.students[0]).toMatchObject({ studentId: ctx.a.studentId, pickupStatus: 'PENDING', pickupTime: '07:30 AM' });

    const foreign = await request(app).get(`${M}/routes/${ctx.b.routeId}`).set(auth(token));
    expect(foreign.status).toBe(404);
  });

  it('fleet lists vehicles and drivers with the route each serves', async () => {
    const res = await request(app).get(`${M}/fleet`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.vehicles).toHaveLength(1);
    expect(res.body.data.vehicles[0]).toMatchObject({ vehicleNumber: 'MP09AA1234', route: { routeName: 'Route 01' } });
    expect(res.body.data.vehicles[0].driver.name).toBe('Rahul Sharma');
    expect(res.body.data.drivers[0]).toMatchObject({ name: 'Rahul Sharma', route: { id: ctx.a.routeId } });
  });

  it('pickup → drop, in that order, and both are idempotent', async () => {
    const early = await mark('post', 'drop', ctx.a.studentId);
    expect(early.status).toBe(409);
    expect(early.body.code).toBe('TRANSPORT_NOT_PICKED_UP');

    const pickup = await mark('post', 'pickup', ctx.a.studentId);
    expect(pickup.status).toBe(200);
    expect(pickup.body.data.pickupStatus).toBe('PICKED_UP');
    const again = await mark('post', 'pickup', ctx.a.studentId);
    expect(again.body.message).toMatch(/Already/);

    const drop = await mark('post', 'drop', ctx.a.studentId);
    expect(drop.status).toBe(200);
    expect(drop.body.data.dropStatus).toBe('DROPPED');

    const overview = await request(app).get(`${M}/overview`).set(auth(token));
    expect(overview.body.data.totals).toMatchObject({ pickedUp: 1, dropped: 1 });

    // The school admin sees the same day, read-only.
    const admin = await request(app).get('/school-portal/transport/daily').set(auth(ctx.a.adminToken));
    expect(admin.status).toBe(200);
    expect(admin.body.data.totals.pickedUp).toBe(1);
    const adminRoute = await request(app).get(`/school-portal/transport/daily/${ctx.a.routeId}`).set(auth(ctx.a.adminToken));
    expect(adminRoute.body.data.students[0].dropStatus).toBe('DROPPED');
  });

  it('a wrong tap can be undone — drop first, then pickup', async () => {
    const blocked = await mark('delete', 'pickup', ctx.a.studentId);
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe('TRANSPORT_ALREADY_DROPPED');

    const undoDrop = await mark('delete', 'drop', ctx.a.studentId);
    expect(undoDrop.body.data.dropStatus).toBe('PENDING');
    const undoPickup = await mark('delete', 'pickup', ctx.a.studentId);
    expect(undoPickup.body.data.pickupStatus).toBe('PENDING');
    expect(undoPickup.body.data.pickedUpAt).toBeNull();

    const run = await request(app).get(`${M}/routes/${ctx.a.routeId}`).set(auth(token));
    expect(run.body.data).toMatchObject({ pickedUpCount: 0, droppedCount: 0 });
  });

  it('refuses a future date, another school’s student, and a student with no transport', async () => {
    const future = await mark('post', 'pickup', ctx.a.studentId, { date: '2999-01-01' });
    expect(future.status).toBe(400);
    const foreign = await mark('post', 'pickup', ctx.b.studentId);
    expect(foreign.status).toBe(404);
    const noBus = await mark('post', 'pickup', ctx.a.studentNoGuardianId);
    expect(noBus.status).toBe(404);
  });
});

describe('Transport manager · account', () => {
  it('forgot password: OTP to the staff mobile, then the new password signs in', async () => {
    const sms = vi.spyOn(smsService, 'sendSms').mockResolvedValue({ delivered: true, provider: 'test' });
    const body = { role: 'TRANSPORT', identifier: 'transport@schoolb.edu' };
    await request(app).post('/school-portal/auth/forgot-password').send(body);
    expect(sms.mock.calls.at(-1)[0].phone).toBe('9811200001');
    const otp = sms.mock.calls.at(-1)[0].message.match(/^(\d{6})/)[1];
    const v = await request(app).post('/school-portal/auth/verify-reset-otp').send({ ...body, otp });
    expect(v.status).toBe(200);
    const r = await request(app)
      .post('/school-portal/auth/reset-password')
      .send({ resetToken: v.body.data.resetToken, newPassword: 'Changed@123' });
    expect(r.status).toBe(200);
    expect((await login('transport@schoolb.edu', 'Changed@123')).status).toBe(200);
  });

  it('change password hands back a fresh token and ends the old session', async () => {
    const res = await request(app)
      .patch(`${M}/change-password`)
      .set(auth(token))
      .send({ currentPassword: PASSWORD, newPassword: 'NewManager@1' });
    expect(res.status).toBe(200);
    const fresh = res.body.data.token;

    expect((await request(app).get(`${M}/me`).set(auth(token))).status).toBe(401);
    expect((await request(app).get(`${M}/me`).set(auth(fresh))).status).toBe(200);
    token = fresh;
  });

  it('a deactivated staff account is signed out', async () => {
    await SchoolUser.updateOne({ email: EMAIL }, { $set: { status: 'INACTIVE' } });
    const res = await request(app).get(`${M}/overview`).set(auth(token));
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TRANSPORT_MANAGER_INACTIVE');
    await SchoolUser.updateOne({ email: EMAIL }, { $set: { status: 'ACTIVE' } });
  });

  it('delete account removes the app login but keeps the staff record', async () => {
    const res = await request(app).post(`${M}/account/delete`).set(auth(token)).send({});
    expect(res.status).toBe(200);
    expect((await request(app).get(`${M}/me`).set(auth(token))).status).toBe(401);
    expect((await login(EMAIL, 'NewManager@1')).status).toBe(401);
    const staff = await SchoolUser.findOne({ email: EMAIL });
    expect(staff.status).toBe('ACTIVE');
    expect(staff.appAccountDeletedAt).toBeTruthy();
  });
});
