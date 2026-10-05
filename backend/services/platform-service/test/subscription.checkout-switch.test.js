import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

// A School Admin with an unfinished checkout picks a different plan. If that
// plan cannot be subscribed to, the request must fail without throwing away the
// checkout that was already in progress.
let app;
let ctx;
let SchoolSubscription;
let monthly;
let inactive;

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const checkout = (planId) =>
  request(app).post('/school-portal/select-plan/checkout').set(auth(ctx.b.adminToken)).send({ planId });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  const { School } = await import('../src/models/School.js');
  const { SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js');
  ({ SchoolSubscription } = await import('../src/models/SchoolSubscription.js'));
  const { clearEntitlementCache } = await import('../src/utils/entitlementCache.js');

  monthly = await SubscriptionPlan.create({ name: 'Switch Test Monthly', price: 249, planType: 'Monthly', billingInterval: 'monthly' });
  inactive = await SubscriptionPlan.create({ name: 'Switch Test Inactive', price: 99, planType: 'Monthly', status: 'inactive' });

  // School B: no plan, one checkout started for the monthly plan and never paid.
  await School.updateOne({ _id: ctx.b.schoolId }, { $set: { subscriptionPlan: '', 'subscription.status': 'Pending Payment', 'subscription.endsAt': null } });
  await SchoolSubscription.deleteMany({ schoolId: ctx.b.schoolId });
  await SchoolSubscription.create({ schoolId: ctx.b.schoolId, planId: monthly._id, totalAmount: 249, status: 'created', razorpaySubscriptionId: 'sub_switch_test' });
  clearEntitlementCache();
}, 120000);

afterAll(disconnect);

describe('Switching plan during an unfinished checkout', () => {
  it('an unavailable plan is refused and the pending checkout is left alone', async () => {
    const res = await checkout(inactive._id.toString());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('This plan is not currently available');

    const rows = await SchoolSubscription.find({ schoolId: ctx.b.schoolId }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('created');
    expect(rows[0].razorpaySubscriptionId).toBe('sub_switch_test');
  });
});
