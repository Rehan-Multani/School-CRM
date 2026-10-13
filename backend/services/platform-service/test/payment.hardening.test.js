/**
 * Payment / plan hardening: the edge cases a careless or hostile user can hit.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let FeePayment;
let FeeInvoice;
let SubscriptionPlan;
let SchoolSubscription;
let School;
let Teacher;
let SchoolUser;
let hrService;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const admin = () => auth(ctx.a.adminToken);
const inDays = (n) => new Date(Date.now() + n * 86400000);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ FeePayment } = await import('../src/models/FeePayment.js'));
  ({ FeeInvoice } = await import('../src/models/FeeInvoice.js'));
  ({ SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js'));
  ({ SchoolSubscription } = await import('../src/models/SchoolSubscription.js'));
  ({ School } = await import('../src/models/School.js'));
  ({ Teacher } = await import('../src/models/Teacher.js'));
  ({ SchoolUser } = await import('../src/models/SchoolUser.js'));
  ({ hrService } = await import('../src/services/hr.service.js'));
}, 120000);
afterAll(disconnect);

describe('Fee payments cannot be doubled', () => {
  it('a retried payment (same Idempotency-Key) is recorded once; a different key is a new payment', async () => {
    const pay = (key) =>
      request(app)
        .post(`/school-portal/fees/invoices/${ctx.a.invoiceId}/pay`)
        .set(admin())
        .set('Idempotency-Key', key)
        .send({ amount: 700, paymentMethod: 'CASH' });

    const [a, b] = await Promise.all([pay('pay-key-1'), pay('pay-key-1')]);
    expect([a.status, b.status].sort()).toEqual([201, 201]); // the retry gets the stored response (or waits and replays it)
    expect(a.body.data.receiptNumber).toBe(b.body.data.receiptNumber);
    expect(await FeePayment.countDocuments({ invoiceId: ctx.a.invoiceId, amount: 700 })).toBe(1);

    const c = await pay('pay-key-2'); // an intentional second payment of the same amount
    expect(c.status).toBe(201);
    expect(await FeePayment.countDocuments({ invoiceId: ctx.a.invoiceId, amount: 700 })).toBe(2);
  });

  it('two concurrent refunds of the same payment refund it once', async () => {
    const paid = await request(app)
      .post(`/school-portal/fees/invoices/${ctx.a.invoiceId}/pay`)
      .set(admin())
      .send({ amount: 1000, paymentMethod: 'UPI', paymentReference: 'ref-race' });
    expect(paid.status).toBe(201);
    const id = paid.body.data.id;

    const refund = () =>
      request(app).post(`/school-portal/fees/payments/${id}/refund`).set(admin()).send({ amount: 1000, reason: 'race', method: 'CASH' });
    const results = await Promise.all([refund(), refund(), refund()]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);

    const payment = await FeePayment.findById(id).lean();
    expect(payment.refundedAmount).toBe(1000);
    const invoice = await FeeInvoice.findById(ctx.a.invoiceId).lean();
    expect(invoice.paidAmount).toBeGreaterThanOrEqual(0);
    expect(invoice.balanceAmount).toBeLessThanOrEqual(invoice.totalAmount);
  });
});

describe('Plan limits cannot be sidestepped through HR', () => {
  it('HR cannot add a teacher past the plan, nor approve or activate a pending one', async () => {
    const plan = await SubscriptionPlan.create({
      name: 'Tight Plan', price: 100, planType: 'Monthly', limits: { students: 50, teachers: 1, staff: 1 },
    });
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    await SchoolSubscription.create({ schoolId: ctx.a.schoolId, planId: plan._id, status: 'active', currentPeriodEnd: inDays(10) });
    await Teacher.deleteMany({ schoolId: ctx.a.schoolId });
    await SchoolUser.deleteMany({ schoolId: ctx.a.schoolId });

    const base = { phone: '9811100000', dateOfBirth: '1990-01-01' };
    await hrService.createEmployee(ctx.a.schoolId, { ...base, employeeType: 'TEACHER', name: 'T One', email: 't1@x.edu', employeeId: 'T1', status: 'ACTIVE' });
    await expect(
      hrService.createEmployee(ctx.a.schoolId, { ...base, employeeType: 'TEACHER', name: 'T Two', email: 't2@x.edu', employeeId: 'T2', status: 'ACTIVE' }),
    ).rejects.toMatchObject({ code: 'PLAN_LIMIT_REACHED' });

    // pending approval does not use a seat ... until it is approved / activated
    const pending = await hrService.createEmployee(ctx.a.schoolId, { ...base, employeeType: 'TEACHER', name: 'T Three', email: 't3@x.edu', employeeId: 'T3' });
    await expect(hrService.approveEmployee(ctx.a.schoolId, pending.id)).rejects.toMatchObject({ code: 'PLAN_LIMIT_REACHED' });
    await expect(hrService.updateEmployeeStatus(ctx.a.schoolId, pending.id, 'ACTIVE')).rejects.toMatchObject({ code: 'PLAN_LIMIT_REACHED' });
  });
});

describe('Plans and subscriptions', () => {
  it('a plan that schools are on cannot be deleted', async () => {
    const plan = await SubscriptionPlan.findOne({ name: 'Tight Plan' });
    const { subscriptionService } = await import('../src/services/subscription.service.js');
    await expect(subscriptionService.deletePlan(plan._id.toString())).rejects.toMatchObject({ statusCode: 409 });
    expect(await SubscriptionPlan.findById(plan._id)).toBeTruthy();
  });

  it('a school admin plan change never switches the plan before it is paid', async () => {
    const plan = await SubscriptionPlan.findOne({ name: 'Tight Plan' });
    const sub = await SchoolSubscription.findOne({ schoolId: ctx.a.schoolId, status: 'active' });
    const big = await SubscriptionPlan.create({ name: 'Big Plan', price: 9999, planType: 'Monthly', limits: { students: 99999 }, razorpayPlanId: 'plan_big_test' });
    await request(app).post('/school-portal/subscription/change-plan').set(admin()).send({ planId: big._id.toString(), schedule: 'now' });
    // Razorpay is not configured in tests, so nothing can switch; either way the plan must be unchanged.
    const fresh = await SchoolSubscription.findById(sub._id).lean();
    expect(String(fresh.planId)).toBe(String(plan._id));
  });

  it('checkout closes a subscription whose paid period ended and nothing renewed it', async () => {
    const plan = await SubscriptionPlan.findOne({ name: 'Tight Plan' });
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    const dead = await SchoolSubscription.create({
      schoolId: ctx.a.schoolId, planId: plan._id, status: 'active', razorpaySubscriptionId: 'sub_dead_1',
      currentPeriodStart: inDays(-40), currentPeriodEnd: inDays(-10),
    });
    await School.updateOne({ _id: ctx.a.schoolId }, { subscriptionPlan: 'Tight Plan', 'subscription.status': 'Active', 'subscription.endsAt': inDays(-10) });

    // Razorpay is not configured here, so opening the NEW subscription fails - but the dead one must be closed first.
    const { schoolService } = await import('../src/services/school.service.js');
    await schoolService.initiateSubscriptionCheckout(ctx.a.schoolId, plan._id.toString(), {}).catch(() => {});

    const closed = await SchoolSubscription.findById(dead._id).lean();
    expect(closed.status).toBe('expired');
    const school = await School.findById(ctx.a.schoolId).lean();
    expect(school.subscriptionPlan).toBe('');
  });

  it('a cancel-at-period-end subscription whose period is over does not block choosing ANY plan', async () => {
    const plan = await SubscriptionPlan.findOne({ name: 'Tight Plan' });
    await SchoolSubscription.deleteMany({ schoolId: ctx.a.schoolId });
    const cancelled = await SchoolSubscription.create({
      schoolId: ctx.a.schoolId, planId: plan._id, status: 'active', cancelAtPeriodEnd: true, razorpaySubscriptionId: 'sub_cancel_1',
      currentPeriodStart: inDays(-40), currentPeriodEnd: inDays(-1),
    });
    await School.updateOne({ _id: ctx.a.schoolId }, { subscriptionPlan: 'Tight Plan', 'subscription.status': 'Active', 'subscription.endsAt': inDays(-1) });

    const other = await SubscriptionPlan.create({ name: 'Other Plan', price: 500, planType: 'Monthly', limits: { students: 300 }, razorpayPlanId: 'plan_other_x' });
    const { schoolService } = await import('../src/services/school.service.js');
    // not the "already selected" 400: the old subscription is closed first (the Razorpay call that follows fails in tests)
    const err = await schoolService.initiateSubscriptionCheckout(ctx.a.schoolId, other._id.toString(), {}).then(() => null, (e) => e);
    expect(err?.message || '').not.toMatch(/already selected/i);

    const closed = await SchoolSubscription.findById(cancelled._id).lean();
    expect(closed.status).toBe('expired');
  });

  it('knows a school has had a subscription before (no second free trial)', async () => {
    const { schoolSubscriptionRepository } = await import('../src/repositories/schoolSubscription.repository.js');
    expect(await schoolSubscriptionRepository.hasEverHadSubscription(ctx.a.schoolId)).toBe(true);
    expect(await schoolSubscriptionRepository.hasEverHadSubscription(ctx.b.schoolId)).toBe(false);
  });
});
