import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connect, disconnect, seed } from './helpers/setup.js';

// Weekly plans are recurring too: Razorpay's plan `period` accepts `weekly`.
let ctx;
let SubscriptionPlan;
let SchoolSubscription;
let mapPlanTypeToInterval;
let assertPlanUsable;
let schoolSubscriptionRepository;

beforeAll(async () => {
  await connect();
  ctx = await seed();
  ({ SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js'));
  ({ SchoolSubscription } = await import('../src/models/SchoolSubscription.js'));
  ({ mapPlanTypeToInterval } = await import('../src/services/subscription.service.js'));
  ({ assertPlanUsable } = await import('../src/services/schoolSubscription.service.js'));
  ({ schoolSubscriptionRepository } = await import('../src/repositories/schoolSubscription.repository.js'));
}, 120000);

afterAll(disconnect);

describe('Weekly recurring plans', () => {
  it('every plan type maps to a Razorpay period', () => {
    expect(mapPlanTypeToInterval('Weekly')).toBe('weekly');
    expect(mapPlanTypeToInterval('Monthly')).toBe('monthly');
    expect(mapPlanTypeToInterval('Yearly')).toBe('yearly');
  });

  it('a Weekly plan linked to Razorpay can be subscribed to', async () => {
    const weekly = await SubscriptionPlan.create({
      name: 'Weekly Test Plan', price: 99, planType: 'Weekly', billingInterval: 'weekly', razorpayPlanId: 'plan_weekly_test',
    });
    const usable = await assertPlanUsable(weekly._id);
    expect(usable.billingInterval).toBe('weekly');
    expect(usable.toPublicJSON().isRecurring).toBe(true);
  });

  it('weekly subscriptions count toward MRR and ARR', async () => {
    const weekly = await SubscriptionPlan.findOne({ name: 'Weekly Test Plan' });
    const monthly = await SubscriptionPlan.create({
      name: 'Monthly Test Plan', price: 249, planType: 'Monthly', billingInterval: 'monthly', razorpayPlanId: 'plan_monthly_test',
    });
    await SchoolSubscription.deleteMany({});
    await SchoolSubscription.create({ schoolId: ctx.a.schoolId, planId: weekly._id, totalAmount: 99, status: 'active' });
    await SchoolSubscription.create({ schoolId: ctx.b.schoolId, planId: monthly._id, totalAmount: 249, status: 'active' });

    const stats = await schoolSubscriptionRepository.stats();
    expect(stats.mrr).toBe(249 + (99 * 52) / 12); // 678
    expect(stats.arr).toBe(249 * 12 + 99 * 52); // 8136
  });
});
