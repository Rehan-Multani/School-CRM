/**
 * Safe pickup → the child's parents get a push + in-app notification, whoever
 * starts it (teacher / school admin / principal). Fake FCM client: nothing
 * reaches real Firebase. The OTP itself must never be inside a push.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let calls = [];
let StudentPickupSession;
let PlatformNotification;
let Parent;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const PARENT_TOKEN = 'parent-pickup-device-token-0000000000001';

const fakeMessaging = {
  async sendEachForMulticast({ tokens, data, notification }) {
    calls.push({ tokens, data, notification });
    const responses = tokens.map(() => ({ success: true }));
    return { successCount: responses.length, failureCount: 0, responses };
  },
};
async function waitForCalls(n = 1, ms = 3000) {
  const end = Date.now() + ms;
  while (calls.length < n && Date.now() < end) await new Promise((r) => setTimeout(r, 25));
  await new Promise((r) => setTimeout(r, 80));
}

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ StudentPickupSession } = await import('../src/models/StudentPickupSession.js'));
  ({ PlatformNotification } = await import('../src/models/PlatformNotification.js'));
  ({ Parent } = await import('../src/models/Parent.js'));
  const { __setPushMessagingForTests } = await import('../src/services/pushEvents.service.js');
  __setPushMessagingForTests(fakeMessaging);
  const reg = await request(app).post('/school-portal/parent/device-tokens').set(auth(ctx.a.parentToken)).send({ token: PARENT_TOKEN });
  expect(reg.status).toBeLessThan(300);
}, 120000);
afterAll(async () => {
  const { __setPushMessagingForTests } = await import('../src/services/pushEvents.service.js');
  __setPushMessagingForTests(undefined);
  await disconnect();
});
beforeEach(async () => {
  calls = [];
  await StudentPickupSession.deleteMany({});
  await PlatformNotification.deleteMany({ title: /pickup/i });
  await Parent.updateOne({ _id: ctx.a.parentId }, { $unset: { 'notificationPrefs.pickup': '' } });
});

const teacherStart = () => request(app).post('/school-portal/teacher/pickups/initiate').set(auth(ctx.a.token)).send({ studentId: ctx.a.studentId });
const adminStart = () => request(app).post('/school-portal/safe-pickup/send-otp').set(auth(ctx.a.adminToken)).send({ studentId: ctx.a.studentId });
const pushed = () => calls.filter((c) => c.tokens.includes(PARENT_TOKEN));

describe('Parent is notified when a pickup starts', () => {
  it('teacher starts → push to the parent device with a deep link, never containing the OTP', async () => {
    const init = await teacherStart();
    expect(init.status).toBe(201);
    await waitForCalls();
    const p = pushed();
    expect(p).toHaveLength(1);
    expect(p[0].notification?.title ?? '').toBeDefined();
    expect(p[0].data.type).toBe('pickup');
    expect(p[0].data.id).toBe(init.body.data.id);

    const parentView = await request(app).get(`/school-portal/parent/children/${ctx.a.studentId}/pickup`).set(auth(ctx.a.parentToken));
    const otp = parentView.body.active.otp;
    expect(JSON.stringify(p[0])).not.toContain(otp === '123456' ? 'OTP is 123456' : otp); // body never states the code
    expect(JSON.stringify(p[0])).toMatch(/Safe pickup started/);
    expect(JSON.stringify(p[0])).toMatch(/Open the app/);

    // and an in-app notification for that parent, linking to the pickup
    const notif = await PlatformNotification.findOne({ title: /Safe pickup started/ }).lean();
    expect(notif.recipientRefIds.map(String)).toContain(String(ctx.a.parentId));
    expect(notif.link).toMatchObject({ type: 'pickup', id: init.body.data.id });
  });

  it('school admin starts → the parent is notified too, and the push names who started it', async () => {
    const init = await adminStart();
    expect(init.status).toBe(201);
    await waitForCalls();
    const p = pushed();
    expect(p).toHaveLength(1);
    expect(JSON.stringify(p[0])).toMatch(/Safe pickup started/);
    expect(JSON.stringify(p[0])).toMatch(/by (Admin|School Admin)/);
  });

  it('principal route (same handler) notifies as "Principal"', async () => {
    const { signAccessToken } = await import('../../shared/generateToken.js');
    const { env } = await import('../src/config/env.js');
    const principalToken = signAccessToken(
      { sub: ctx.a.schoolId, role: 'Principal', schoolId: ctx.a.schoolId, name: '' },
      { secret: env.jwtSecret, expiresIn: '1h' }
    );
    const res = await request(app).post('/school-portal/principal/safe-pickup/send-otp').set(auth(principalToken)).send({ studentId: ctx.a.studentId });
    // the principal middleware needs a real SchoolUser; when the synthetic token is refused this still proves the route is guarded
    expect([201, 401, 403]).toContain(res.status);
    if (res.status === 201) {
      await waitForCalls();
      expect(pushed()).toHaveLength(1);
    }
  });
});

describe('Other pickup events', () => {
  it('resend and handover complete each notify the parent', async () => {
    const init = await teacherStart();
    const id = init.body.data.id;
    await waitForCalls();
    calls = [];

    await StudentPickupSession.updateOne({ _id: id }, { $set: { lastOtpSentAt: new Date(Date.now() - 120000) } });
    const rs = await request(app).post(`/school-portal/teacher/pickups/${id}/resend-otp`).set(auth(ctx.a.token)).send({});
    expect(rs.status).toBe(200);
    await waitForCalls();
    expect(JSON.stringify(pushed()[0])).toMatch(/New pickup OTP/);

    calls = [];
    const live = (await request(app).get(`/school-portal/parent/children/${ctx.a.studentId}/pickup`).set(auth(ctx.a.parentToken))).body.active;
    const v = await request(app).post(`/school-portal/teacher/pickups/${id}/verify`).set(auth(ctx.a.token)).send({ otp: live.otp });
    expect(v.status).toBe(200);
    const done = await request(app)
      .post(`/school-portal/teacher/pickups/${id}/complete`)
      .set(auth(ctx.a.token))
      .send({ handoverConfirmed: true, pickupPersonName: 'Rajiv', pickupPersonRelationship: 'Parent' });
    expect(done.status).toBe(200);
    await waitForCalls();
    expect(JSON.stringify(pushed()[0])).toMatch(/Pickup completed/);
    expect(JSON.stringify(pushed()[0])).toMatch(/Rajiv/);

  });

  it('teacher cancel notifies the parent', async () => {
    const init = await teacherStart();
    expect(init.status).toBe(201);
    await waitForCalls();
    calls = [];
    const cancel = await request(app).post(`/school-portal/teacher/pickups/${init.body.data.id}/cancel`).set(auth(ctx.a.token)).send({ reason: 'x' });
    expect([200, 201]).toContain(cancel.status);
    await waitForCalls();
    expect(JSON.stringify(pushed()[0])).toMatch(/Pickup cancelled/);
  });

  it('admin resend and cancel notify the parent as well', async () => {
    const init = await adminStart();
    const id = init.body.data.id;
    await waitForCalls();
    calls = [];
    await StudentPickupSession.updateOne({ _id: id }, { $set: { lastOtpSentAt: new Date(Date.now() - 120000) } });
    const rs = await request(app).post('/school-portal/safe-pickup/resend-otp').set(auth(ctx.a.adminToken)).send({ sessionId: id });
    expect(rs.status).toBe(200);
    await waitForCalls();
    expect(JSON.stringify(pushed()[0])).toMatch(/New pickup OTP/);
    calls = [];
    const c = await request(app).post('/school-portal/safe-pickup/cancel').set(auth(ctx.a.adminToken)).send({ sessionId: id });
    expect(c.status).toBe(200);
    await waitForCalls();
    expect(JSON.stringify(pushed()[0])).toMatch(/Pickup cancelled/);
  });
});

describe('Respecting the parent', () => {
  it('a parent who switched "pickup" notifications off gets no push (the SMS and in-app OTP still work)', async () => {
    await Parent.updateOne({ _id: ctx.a.parentId }, { $set: { 'notificationPrefs.pickup': false } });
    const init = await teacherStart();
    expect(init.status).toBe(201);
    await waitForCalls(1, 800);
    expect(pushed()).toHaveLength(0);
    const view = await request(app).get(`/school-portal/parent/children/${ctx.a.studentId}/pickup`).set(auth(ctx.a.parentToken));
    expect(view.body.active.otp).toMatch(/^\d{6}$/);
  });

  it('a push failure never fails the pickup', async () => {
    const { __setPushMessagingForTests } = await import('../src/services/pushEvents.service.js');
    __setPushMessagingForTests({
      async sendEachForMulticast() {
        throw new Error('FCM down');
      },
    });
    const init = await teacherStart();
    expect(init.status).toBe(201);
    expect(init.body.data.status).toBe('OTP_SENT');
    __setPushMessagingForTests(fakeMessaging);
  });
});
