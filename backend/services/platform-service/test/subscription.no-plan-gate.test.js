import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

// A school without a plan: its School Admin can only reach the Plans page, and
// nobody else in the school can sign in. School A keeps its plan throughout
// (control); School B's plan state is changed by each block.
let app;
let ctx;
let School;
let SchoolSubscription;
let SubscriptionPlan;
let clearEntitlementCache;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const BLOCKED = 'SCHOOL_SUBSCRIPTION_INACTIVE';
const BLOCKED_MESSAGE =
  'Your school does not have an active subscription, so sign-in is turned off. Please contact your school administrator.';

const auth = (token) => ({ Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` });

async function setManualPlan(schoolId, patch) {
  await School.updateOne({ _id: schoolId }, { $set: patch });
  clearEntitlementCache();
}
const noPlan = (id) => setManualPlan(id, { subscriptionPlan: '', 'subscription.status': 'Pending Payment', 'subscription.endsAt': null });

let plan;
async function setRecurring(schoolId, fields) {
  await SchoolSubscription.deleteMany({ schoolId });
  if (fields) await SchoolSubscription.create({ schoolId, planId: plan._id, totalAmount: 100, ...fields });
  clearEntitlementCache();
}

const adminLogin = (email) => request(app).post('/school-auth/login').send({ email, password: 'Admin@123' });
// The login endpoints are rate limited, so the School Admin signs in once and
// each check re-reads its state from /school-portal/me — which is also what the
// panel does on every page load.
let adminToken;
const adminGet = (path) => request(app).get(path).set(auth(adminToken));
const adminState = async () => (await adminGet('/school-portal/me')).body.user;
// Admin-only routes that are not on the gate's exempt list.
const GATED = ['/school-portal/academic/classes', '/school-portal/academic/teachers', '/school-portal/academic/years', '/school-portal/fees/heads'];
const teacherLogin = (slug) => request(app).post('/school-portal/auth/teacher-login').send({ identifier: `teacher@${slug}.edu`, password: 'Passw0rd!' });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ School } = await import('../src/models/School.js'));
  ({ SchoolSubscription } = await import('../src/models/SchoolSubscription.js'));
  ({ SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js'));
  ({ clearEntitlementCache } = await import('../src/utils/entitlementCache.js'));
  const hash = await bcrypt.hash('Admin@123', 10);
  await School.updateMany({}, { $set: { 'admin.passwordHash': hash, 'admin.hasLogin': true } });
  plan = await SubscriptionPlan.findOne({}) || (await SubscriptionPlan.create({ name: 'Gate Test Plan', price: 100, planType: 'Monthly', billingInterval: 'monthly' }));
}, 120000);
afterAll(disconnect);

describe('School with NO plan', () => {
  beforeAll(async () => {
    await setRecurring(ctx.b.schoolId, null);
    await noPlan(ctx.b.schoolId);
  });

  it('the School Admin can still log in, and is told there is no plan', async () => {
    const res = await adminLogin('admin@schoolb.edu');
    expect(res.status).toBe(200);
    expect(res.body.user.hasPlan).toBe(false);
    expect(res.body.user.subscriptionState).toBe('none');
    adminToken = res.body.token;
  });

  it('the School Admin reaches the Plans endpoints but nothing else', async () => {
    expect((await adminGet('/school-portal/me')).status).toBe(200);
    expect((await adminGet('/school-portal/plans')).status).toBe(200);

    for (const path of GATED) {
      const res = await adminGet(path);
      expect(res.status, path).toBe(402);
      expect(res.body.code, path).toBe('SUBSCRIPTION_REQUIRED');
      expect(res.body.message).toBe('Your school does not have a plan yet. Please choose a plan to continue.');
    }
  });

  it('a plan NAME alone is not a plan (unpaid / never activated)', async () => {
    await setManualPlan(ctx.b.schoolId, { subscriptionPlan: 'Growth Plan', 'subscription.status': 'Pending Payment' });
    expect((await adminState()).hasPlan).toBe(false);
    expect((await adminGet(GATED[0])).status).toBe(402);
    await noPlan(ctx.b.schoolId);
  });

  it('teacher, student, parent and driver cannot sign in — each gets the same clear message', async () => {
    const attempts = [
      teacherLogin('schoolb'),
      request(app).post('/school-portal/auth/student-login').send({ identifier: ctx.b.studentLoginEmail, password: ctx.b.studentPassword }),
      request(app).post('/school-portal/auth/parent-login').send({ identifier: ctx.b.parentLoginEmail, password: ctx.b.parentPassword }),
      request(app).post('/school-portal/auth/driver-login').send({ mobile: ctx.b.driverMobile, password: ctx.b.driverPassword }),
    ];
    for (const res of await Promise.all(attempts)) {
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(BLOCKED);
      expect(res.body.message).toBe(BLOCKED_MESSAGE);
      expect(res.body.token).toBeUndefined();
    }
  });

  it('a wrong password is still "invalid credentials" — the plan state is not revealed to strangers', async () => {
    const res = await request(app).post('/school-portal/auth/teacher-login').send({ identifier: 'teacher@schoolb.edu', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.code).not.toBe(BLOCKED);
  });

  it('someone who was already signed in is blocked on their next request (402), not logged out', async () => {
    const res = await request(app).get('/school-portal/teacher/dashboard').set(auth(ctx.b.token));
    expect(res.status).toBe(402);
    expect(res.body.code).toBe(BLOCKED);
    expect(res.body.message).toBe(BLOCKED_MESSAGE);
    // Their own "me" still answers, so the app can show the blocked screen.
    expect((await request(app).get('/school-portal/teacher/me').set(auth(ctx.b.token))).status).toBe(200);
  });

  it('the other school, which has a plan, is untouched', async () => {
    expect((await teacherLogin('schoola')).status).toBe(200);
    expect((await request(app).get('/school-portal/teacher/dashboard').set(auth(ctx.a.token))).status).toBe(200);
  });
});

describe('Manual plan (activated without autopay)', () => {
  it('works while Active and its end date is ahead', async () => {
    await setRecurring(ctx.b.schoolId, null);
    await setManualPlan(ctx.b.schoolId, { subscriptionPlan: 'Growth Plan', 'subscription.status': 'Active', 'subscription.endsAt': new Date(Date.now() + 30 * DAY) });
    expect((await adminState()).subscriptionState).toBe('manual');
    expect((await teacherLogin('schoolb')).status).toBe(200);
  });

  it('locks the school the moment its end date passes', async () => {
    await setManualPlan(ctx.b.schoolId, { 'subscription.endsAt': new Date(Date.now() - HOUR) });
    expect((await adminState()).hasPlan).toBe(false);
    expect((await teacherLogin('schoolb')).status).toBe(403);
  });
});

describe('Autopay (recurring) subscription', () => {
  beforeAll(() => noPlan(ctx.b.schoolId));

  it('active → everything works', async () => {
    await setRecurring(ctx.b.schoolId, { status: 'active', currentPeriodStart: new Date(Date.now() - DAY), currentPeriodEnd: new Date(Date.now() + 29 * DAY) });
    const admin = await adminState();
    expect(admin.hasPlan).toBe(true);
    expect(admin.subscriptionState).toBe('active');
    for (const path of GATED) expect((await adminGet(path)).status, path).toBe(200);
    expect((await teacherLogin('schoolb')).status).toBe(200);
  });

  it('admin cancels → keeps working until the end of the paid period', async () => {
    await setRecurring(ctx.b.schoolId, { status: 'active', cancelAtPeriodEnd: true, currentPeriodStart: new Date(Date.now() - 20 * DAY), currentPeriodEnd: new Date(Date.now() + 10 * DAY) });
    const admin = await adminState();
    expect(admin.hasPlan).toBe(true);
    expect(admin.subscriptionState).toBe('cancelled_pending');
    expect((await adminGet(GATED[0])).status).toBe(200);
    expect((await teacherLogin('schoolb')).status).toBe(200);
  });

  it('…and once that period ends: admin goes to Plans only, staff cannot sign in (even before the cron/webhook runs)', async () => {
    await setRecurring(ctx.b.schoolId, { status: 'active', cancelAtPeriodEnd: true, currentPeriodStart: new Date(Date.now() - 31 * DAY), currentPeriodEnd: new Date(Date.now() - HOUR) });
    // The stale plan name is still on the school record, as it is until the cron clears it.
    await setManualPlan(ctx.b.schoolId, { subscriptionPlan: 'Gate Test Plan', 'subscription.status': 'Active', 'subscription.endsAt': new Date(Date.now() - HOUR) });

    // A fresh login still works for the admin — and lands on Plans only.
    const admin = await adminLogin('admin@schoolb.edu');
    expect(admin.status).toBe(200);
    expect(admin.body.user.hasPlan).toBe(false);
    expect(admin.body.user.subscriptionState).toBe('expired');

    const blocked = await adminGet(GATED[0]);
    expect(blocked.status).toBe(402);
    expect(blocked.body.code).toBe('SUBSCRIPTION_EXPIRED');
    expect((await adminGet('/school-portal/plans')).status).toBe(200);

    const teacher = await teacherLogin('schoolb');
    expect(teacher.status).toBe(403);
    expect(teacher.body.code).toBe(BLOCKED);
    await noPlan(ctx.b.schoolId);
  });

  it('a failed payment keeps the school working during the grace period', async () => {
    await setRecurring(ctx.b.schoolId, { status: 'halted', currentPeriodEnd: new Date(Date.now() - DAY), gracePeriodEndsAt: new Date(Date.now() + 3 * DAY) });
    expect((await adminState()).subscriptionState).toBe('grace_period');
    expect((await teacherLogin('schoolb')).status).toBe(200);
  });

  it('expired after the grace period → locked', async () => {
    await setRecurring(ctx.b.schoolId, { status: 'expired', currentPeriodEnd: new Date(Date.now() - 10 * DAY), gracePeriodEndsAt: new Date(Date.now() - DAY) });
    expect((await adminState()).hasPlan).toBe(false);
    expect((await teacherLogin('schoolb')).status).toBe(403);
  });

  it('buying again unlocks everything at once', async () => {
    await setRecurring(ctx.b.schoolId, { status: 'active', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * DAY) });
    expect((await adminState()).hasPlan).toBe(true);
    expect((await teacherLogin('schoolb')).status).toBe(200);
    expect((await request(app).get('/school-portal/teacher/dashboard').set(auth(ctx.b.token))).status).toBe(200);
  });
});
