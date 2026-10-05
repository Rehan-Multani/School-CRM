import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

// Opening the Razorpay checkout creates a subscription in `created` state.
// Until it is paid it must grant nothing: the School Admin stays on the Plans
// page and nobody else in the school can sign in.
let app;
let ctx;
let School;
let SchoolSubscription;
let plan;
let clearEntitlementCache;
let razorpaySubscriptionService;

const DAY = 24 * 60 * 60 * 1000;
const GATED = '/school-portal/academic/classes';

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const adminGet = (path) => request(app).get(path).set(auth(ctx.b.adminToken));
const adminState = async () => (await adminGet('/school-portal/me')).body.user;
const sync = () => request(app).post('/school-portal/subscription/sync').set(auth(ctx.b.adminToken));

// School B's subscription rows, oldest first.
async function setRows(...rows) {
  await SchoolSubscription.deleteMany({ schoolId: ctx.b.schoolId });
  let createdAt = Date.now() - rows.length * 60000;
  for (const row of rows) {
    createdAt += 60000;
    await SchoolSubscription.create({ schoolId: ctx.b.schoolId, planId: plan._id, totalAmount: 99, createdAt: new Date(createdAt), ...row });
  }
  clearEntitlementCache();
}

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ School } = await import('../src/models/School.js'));
  ({ SchoolSubscription } = await import('../src/models/SchoolSubscription.js'));
  ({ clearEntitlementCache } = await import('../src/utils/entitlementCache.js'));
  ({ razorpaySubscriptionService } = await import('../src/services/razorpaySubscription.service.js'));
  const { SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js');
  plan = await SubscriptionPlan.create({ name: 'Unpaid Test Plan', price: 99, planType: 'Weekly', billingInterval: 'weekly', razorpayPlanId: 'plan_unpaid_test' });
  await School.updateOne({ _id: ctx.b.schoolId }, { $set: { subscriptionPlan: '', 'subscription.status': 'Pending Payment', 'subscription.endsAt': null } });
}, 120000);

afterEach(() => vi.restoreAllMocks());
afterAll(disconnect);

describe('A checkout that was opened but not paid', () => {
  it('gives the school no access', async () => {
    await setRows({ status: 'created', razorpaySubscriptionId: 'sub_unpaid_1' });

    const user = await adminState();
    expect(user.hasPlan).toBe(false);
    expect(user.subscriptionState).toBe('none');

    const blocked = await adminGet(GATED);
    expect(blocked.status).toBe(402);
    expect(blocked.body.code).toBe('SUBSCRIPTION_REQUIRED');
    expect((await adminGet('/school-portal/plans')).status).toBe(200);

    const teacher = await request(app).post('/school-portal/auth/teacher-login').send({ identifier: 'teacher@schoolb.edu', password: 'Passw0rd!' });
    expect(teacher.status).toBe(403);
  });

  it('does not hide a paid period that is still running', async () => {
    await setRows(
      { status: 'cancelled', razorpaySubscriptionId: 'sub_paid_1', currentPeriodStart: new Date(Date.now() - 20 * DAY), currentPeriodEnd: new Date(Date.now() + 10 * DAY) },
      { status: 'created', razorpaySubscriptionId: 'sub_unpaid_2' }
    );
    const user = await adminState();
    expect(user.hasPlan).toBe(true);
    expect(user.subscriptionState).toBe('cancelled_pending');
  });

  it('still counts as expired after an earlier subscription ran out', async () => {
    await setRows(
      { status: 'cancelled', razorpaySubscriptionId: 'sub_paid_2', currentPeriodStart: new Date(Date.now() - 40 * DAY), currentPeriodEnd: new Date(Date.now() - 10 * DAY) },
      { status: 'created', razorpaySubscriptionId: 'sub_unpaid_3' }
    );
    const user = await adminState();
    expect(user.hasPlan).toBe(false);
    expect(user.subscriptionState).toBe('expired');
  });
});

describe('Confirming the checkout with Razorpay', () => {
  it('stays locked while Razorpay still reports it unpaid', async () => {
    await setRows({ status: 'created', razorpaySubscriptionId: 'sub_sync_1' });
    vi.spyOn(razorpaySubscriptionService, 'isConfigured').mockReturnValue(true);
    vi.spyOn(razorpaySubscriptionService, 'fetchSubscription').mockResolvedValue({ id: 'sub_sync_1', status: 'created' });

    const res = await sync();
    expect(res.status).toBe(200);
    expect(res.body.data.hasFullAccess).toBe(false);
    expect((await adminState()).hasPlan).toBe(false);
  });

  it('opens the school as soon as Razorpay reports it paid', async () => {
    await setRows({ status: 'created', razorpaySubscriptionId: 'sub_sync_2' });
    const start = Math.floor(Date.now() / 1000);
    vi.spyOn(razorpaySubscriptionService, 'isConfigured').mockReturnValue(true);
    const fetch = vi
      .spyOn(razorpaySubscriptionService, 'fetchSubscription')
      .mockResolvedValue({ id: 'sub_sync_2', status: 'active', current_start: start, current_end: start + 7 * 86400 });

    const res = await sync();
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith('sub_sync_2');
    expect(res.body.data).toEqual({ state: 'active', hasFullAccess: true });

    const user = await adminState();
    expect(user.hasPlan).toBe(true);
    expect(user.subscriptionPlan).toBe('Unpaid Test Plan');
    expect((await adminGet(GATED)).status).toBe(200);
  });

  it('does nothing when there is no open checkout', async () => {
    await setRows({ status: 'active', razorpaySubscriptionId: 'sub_sync_3', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 7 * DAY) });
    vi.spyOn(razorpaySubscriptionService, 'isConfigured').mockReturnValue(true);
    const fetch = vi.spyOn(razorpaySubscriptionService, 'fetchSubscription');

    expect((await sync()).status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });
});
