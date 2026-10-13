/**
 * End to end: the "Subscription invoice tax" setting on the platform invoices.
 *   - Super Admin creates an invoice (POST /billings)
 *   - a Razorpay charge with no Razorpay invoice -> local invoice
 *   - a Razorpay charge that carries its own invoice -> Razorpay's numbers win
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { signAccessToken } from '../../shared/generateToken.js';
import { env } from '../src/config/env.js';

let app;
let ctx;
let superToken;
let plan;
let sub;
let ensureInvoiceForCharge;
let platformSettingService;
let SubscriptionPlan;
let SchoolSubscription;

const auth = (t) => ({ Authorization: `Bearer ${t}` });
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString();

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ ensureInvoiceForCharge } = await import('../src/services/razorpayWebhook.service.js'));
  ({ platformSettingService } = await import('../src/services/platformSetting.service.js'));
  ({ SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js'));
  ({ SchoolSubscription } = await import('../src/models/SchoolSubscription.js'));

  superToken = signAccessToken({ sub: 'sa-1', role: 'SuperAdmin', name: 'Super Admin' }, { secret: env.jwtSecret, expiresIn: '1h' });

  plan = await SubscriptionPlan.create({ name: 'E2E Plan', price: 1000, planType: 'Monthly', limits: { students: 100 } });
  sub = await SchoolSubscription.create({
    schoolId: ctx.a.schoolId, planId: plan._id, status: 'active',
    razorpaySubscriptionId: 'sub_e2e_1', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
  });
  sub = await SchoolSubscription.findById(sub._id).populate('planId').populate('schoolId');
}, 120000);
afterAll(disconnect);

describe('Super Admin creates an invoice', () => {
  it('adds the platform tax % on top of the plan price', async () => {
    await platformSettingService.updateSettings({ taxPercent: 18 }, 'test');
    const res = await request(app)
      .post('/billings')
      .set(auth(superToken))
      .send({ schoolId: ctx.a.schoolId, planName: 'E2E Plan', dueAt: inDays(7) });
    expect(res.status).toBe(201);
    const inv = res.body.data;
    expect(inv).toMatchObject({ subtotal: 1000, taxPercent: 18, tax: 180, totalAmount: 1180 });
    expect(inv.planName).toBe('E2E Plan');
  });

  it('uses 0% when the tax is set to 0, and the plan override when the plan has one', async () => {
    await platformSettingService.updateSettings({ taxPercent: 0 }, 'test');
    const zero = await request(app).post('/billings').set(auth(superToken)).send({ schoolId: ctx.a.schoolId, planName: 'E2E Plan', dueAt: inDays(7) });
    expect(zero.body.data).toMatchObject({ tax: 0, totalAmount: 1000 });

    await SubscriptionPlan.updateOne({ _id: plan._id }, { taxPercent: 5 });
    const over = await request(app).post('/billings').set(auth(superToken)).send({ schoolId: ctx.a.schoolId, planName: 'E2E Plan', dueAt: inDays(7) });
    expect(over.body.data).toMatchObject({ taxPercent: 5, tax: 50, totalAmount: 1050 });
    await SubscriptionPlan.updateOne({ _id: plan._id }, { taxPercent: null });
  });
});

describe('Razorpay subscription charges', () => {
  it('builds a local invoice with the tax when Razorpay sent no invoice', async () => {
    await platformSettingService.updateSettings({ taxPercent: 18 }, 'test');
    const payment = { id: 'pay_e2e_local', amount: 100000, currency: 'INR', captured: true, method: 'upi', created_at: Math.floor(Date.now() / 1000) };
    const invoice = await ensureInvoiceForCharge(sub, payment, null);

    expect(invoice.source).toBe('RAZORPAY_SUBSCRIPTION');
    expect(invoice.invoiceNumber).toMatch(/^INV-/);
    expect(invoice.status).toBe('Paid');
    expect(invoice).toMatchObject({ subtotal: 1000, taxPercent: 18, tax: 180, totalAmount: 1180 });

    // the same payment never creates a second invoice
    const again = await ensureInvoiceForCharge(sub, payment, null);
    expect(String(again._id)).toBe(String(invoice._id));

    // KNOWN GAP: Razorpay actually captured 100000 paise (= plan price, no GST on top)
    // while the local invoice says 1180. Documented so a fix is a conscious change.
    expect(payment.amount / 100).toBe(1000);
    expect(invoice.totalAmount).not.toBe(payment.amount / 100);
  });

  it("keeps Razorpay's own numbers when the charge carries a Razorpay invoice", async () => {
    const payment = { id: 'pay_e2e_rzp', amount: 118000, currency: 'INR', captured: true, method: 'card', created_at: Math.floor(Date.now() / 1000) };
    const rzpInvoice = {
      id: 'inv_rzp_e2e_1', amount: 118000, currency: 'INR', status: 'paid',
      date: Math.floor(Date.now() / 1000), paid_at: Math.floor(Date.now() / 1000), short_url: 'https://rzp.io/i/abc',
    };
    const invoice = await ensureInvoiceForCharge(sub, payment, rzpInvoice);
    expect(invoice.razorpayInvoiceId).toBe('inv_rzp_e2e_1');
    expect(invoice.totalAmount ?? invoice.amount).toBe(1180);
  });

  it('is visible to the Super Admin invoices list', async () => {
    const res = await request(app).get(`/school-subscriptions/${sub._id}/invoices`).set(auth(superToken));
    expect(res.status).toBe(200);
    const numbers = JSON.stringify(res.body);
    expect(numbers).toContain('pay_e2e_local');
  });
});
