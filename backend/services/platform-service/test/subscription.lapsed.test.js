import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { isLapsed, isLapseExpired, lapseDeadline, RENEWAL_BUFFER_DAYS, LAPSE_GRACE_DAYS } from '../src/utils/subscriptionLapse.js';

const day = 86400000;
const sub = (over = {}) => ({ status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: new Date(Date.now() - 8 * day), ...over });
const endedAgo = (d) => new Date(Date.now() - d * day);

describe('lapse rules', () => {
  it('has a 1 day renewal window, then the plan is over', () => {
    expect(isLapsed(sub({ currentPeriodEnd: endedAgo(0.5) }))).toBe(false); // renewal processing
    expect(isLapseExpired(sub({ currentPeriodEnd: endedAgo(0.5) }))).toBe(false);
    expect(isLapsed(sub({ currentPeriodEnd: endedAgo(RENEWAL_BUFFER_DAYS + 0.5) }))).toBe(true);
    expect(isLapseExpired(sub({ currentPeriodEnd: endedAgo(RENEWAL_BUFFER_DAYS + LAPSE_GRACE_DAYS + 0.5) }))).toBe(true);
    expect(isLapsed(sub({ status: 'authenticated' }))).toBe(true);
  });

  it('is not lapsed before the period ends', () => {
    expect(isLapsed(sub({ currentPeriodEnd: new Date(Date.now() + 3 * day) }))).toBe(false);
  });

  it('ignores statuses handled elsewhere, cancel-at-period-end, trials and missing dates', () => {
    for (const over of [{ status: 'cancelled' }, { status: 'halted' }, { cancelAtPeriodEnd: true }, { currentPeriodEnd: null }, { trialEnd: new Date(Date.now() + day) }]) {
      expect(isLapsed(sub(over))).toBe(false);
      expect(isLapseExpired(sub(over))).toBe(false);
    }
    expect(isLapsed(null)).toBe(false);
  });

  it('gives the date access closes', () => {
    const end = new Date('2026-10-12T00:00:00Z');
    const d = lapseDeadline({ currentPeriodEnd: end });
    expect(d.getTime() - end.getTime()).toBe((RENEWAL_BUFFER_DAYS + LAPSE_GRACE_DAYS) * day);
  });
});

describe('lapsed subscription in the system', () => {
  let ctx;
  let app;
  let SubscriptionPlan;
  let SchoolSubscription;
  let School;
  let Invoice;
  let SubscriptionHistory;
  let accessService;
  let schoolSubscriptionService;
  let plan;

  beforeAll(async () => {
    await connect();
    ctx = await seed();
    app = await getApp();
    ({ SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js'));
    ({ SchoolSubscription } = await import('../src/models/SchoolSubscription.js'));
    ({ School } = await import('../src/models/School.js'));
    ({ Invoice } = await import('../src/models/Invoice.js'));
    ({ SubscriptionHistory } = await import('../src/models/SubscriptionHistory.js'));
    ({ subscriptionAccessService: accessService } = await import('../src/services/subscriptionAccess.service.js'));
    ({ schoolSubscriptionService } = await import('../src/services/schoolSubscription.service.js'));
    plan = await SubscriptionPlan.create({ name: 'Lapse Plan', price: 213, planType: 'Monthly', limits: { students: 50 } });
  }, 120000);
  afterAll(disconnect);

  const makeSub = (periodEndDaysAgo, over = {}) =>
    SchoolSubscription.create({
      schoolId: ctx.a.schoolId, planId: plan._id, status: 'active', razorpaySubscriptionId: `sub_lapse_${Math.random().toString(36).slice(2, 8)}`,
      currentPeriodStart: endedAgo(periodEndDaysAgo + 30), currentPeriodEnd: endedAgo(periodEndDaysAgo), ...over,
    });

  it('keeps access while the renewal is processing, closes it after that', async () => {
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    await School.updateOne({ _id: ctx.a.schoolId }, { subscriptionPlan: '', 'subscription.status': 'Expired' });

    await makeSub(0.5); // period ended 12h ago: renewal still processing
    let ent = await accessService.getEntitlement(ctx.a.schoolId);
    expect(ent.state).toBe('active');
    expect(ent.hasFullAccess).toBe(true);

    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    await makeSub(2); // nothing renewed it: the school must buy a plan again
    ent = await accessService.getEntitlement(ctx.a.schoolId);
    expect(ent.state).toBe('expired');
    expect(ent.hasFullAccess).toBe(false);
  });

  it('exposes lapsed + the access deadline to the panels', async () => {
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    const s = await makeSub(1.5);
    const json = s.toPublicJSON();
    expect(json.lapsed).toBe(true);
    expect(new Date(json.lapseDeadline).getTime()).toBeLessThan(Date.now()); // already past: access is closed
  });

  it('expireLapsed closes the sub, writes history and takes the plan off the school', async () => {
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    await School.updateOne({ _id: ctx.a.schoolId }, { subscriptionPlan: 'Lapse Plan', 'subscription.status': 'Active', 'subscription.endsAt': endedAgo(9) });
    const s = await makeSub(9);

    await schoolSubscriptionService.expireLapsed(s, { performedBy: 'Test', source: 'cron' });
    const fresh = await SchoolSubscription.findById(s._id);
    expect(fresh.status).toBe('expired');
    expect(fresh.endedAt).toBeTruthy();

    const school = await School.findById(ctx.a.schoolId).lean();
    expect(school.subscriptionPlan).toBe('');
    expect(school.subscription.status).toBe('Expired');

    const hist = await SubscriptionHistory.findOne({ subscriptionId: s._id, action: 'expired' });
    expect(hist.reason).toMatch(/no renewal/i);
  });

  it('School Admin sees invoices and payments of ALL their subscriptions', async () => {
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    await Invoice.deleteMany({ school: ctx.a.schoolId });
    const oldSub = await makeSub(40, { status: 'expired' });
    const newSub = await makeSub(0);
    for (const [n, sb] of [['INV-L-1', oldSub], ['INV-L-2', newSub]]) {
      await Invoice.create({
        invoiceNumber: n, school: ctx.a.schoolId, schoolName: 'S', schoolCode: 'S', planName: 'Lapse Plan', planType: 'Monthly',
        amount: 213, subtotal: 213, totalAmount: 213, status: 'Paid', issuedAt: new Date(), dueAt: new Date(), subscriptionId: sb._id,
        source: 'RAZORPAY_SUBSCRIPTION',
      });
    }
    const res = await request(app).get('/school-portal/subscription/invoices').set({ Authorization: `Bearer ${ctx.a.adminToken}` });
    expect(res.status).toBe(200);
    expect(res.body.data.map((i) => i.invoiceNumber).sort()).toEqual(['INV-L-1', 'INV-L-2']);
  });
});
