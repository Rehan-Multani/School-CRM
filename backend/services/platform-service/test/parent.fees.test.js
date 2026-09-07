import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let parentFeePaymentService;
let FeeInvoice;
let FeePayment;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const kidA = () => `/school-portal/parent/children/${ctx.a.studentId}`;

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ parentFeePaymentService } = await import('../src/services/parentFeePayment.service.js'));
  ({ FeeInvoice } = await import('../src/models/FeeInvoice.js'));
  ({ FeePayment } = await import('../src/models/FeePayment.js'));
}, 60000);
afterAll(disconnect);

describe('Parent APK — fees (read) + Pay Now', () => {
  it('summary / invoices / detail reflect the seeded invoice', async () => {
    const summary = await request(app).get(`${kidA()}/fees/summary`).set(auth(ctx.a.parentToken));
    expect(summary.status).toBe(200);
    expect(summary.body.data.totalFees).toBe(8000);
    expect(summary.body.data.pending).toBe(8000);

    const list = await request(app).get(`${kidA()}/fees/invoices`).set(auth(ctx.a.parentToken));
    expect(list.body.data.some((i) => i.id === ctx.a.invoiceId)).toBe(true);

    const detail = await request(app).get(`${kidA()}/fees/invoices/${ctx.a.invoiceId}`).set(auth(ctx.a.parentToken));
    expect(detail.body.data.items[0].feeHeadName).toBe('Tuition Fee');
  });

  // NB: the pay-order endpoint calls the live Razorpay orders API once the
  // server-side pre-checks pass. These tests only exercise the pre-network
  // guards (amount validation, ownership) so no external call is made.
  it('pay-order rejects an amount larger than the balance (400, before any gateway call)', async () => {
    const res = await request(app)
      .post(`${kidA()}/fees/invoices/${ctx.a.invoiceId}/pay-order`)
      .set(auth(ctx.a.parentToken))
      .set('Idempotency-Key', 'pm-fee-bad-amt')
      .send({ amount: 999999 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PAYMENT_AMOUNT_INVALID');
  });

  it('cannot start a payment for another school’s invoice (403 — child link check runs first)', async () => {
    const res = await request(app)
      .post(`/school-portal/parent/children/${ctx.b.studentId}/fees/invoices/${ctx.b.invoiceId}/pay-order`)
      .set(auth(ctx.a.parentToken))
      .set('Idempotency-Key', 'pm-fee-x')
      .send({});
    expect(res.status).toBe(403);
  });

  it('webhook reconcile: a captured SCHOOL_FEE payment marks the invoice PAID exactly once', async () => {
    const inv = await FeeInvoice.findById(ctx.a.invoiceId).lean();
    const entity = {
      id: 'pay_TESTA1',
      order_id: 'order_TESTA1',
      amount: Math.round(inv.balanceAmount * 100),
      notes: {
        type: 'SCHOOL_FEE',
        schoolId: ctx.a.schoolId,
        parentId: ctx.a.parentId,
        studentId: ctx.a.studentId,
        invoiceId: ctx.a.invoiceId,
      },
    };

    const first = await parentFeePaymentService.reconcileFromRazorpay(entity);
    expect(first.handled).toBe(true);
    expect(first.invoiceStatus).toBe('PAID');

    const second = await parentFeePaymentService.reconcileFromRazorpay(entity); // replay
    expect(second.alreadyProcessed).toBe(true);

    const payments = await FeePayment.find({ invoiceId: ctx.a.invoiceId, status: 'COMPLETED' }).lean();
    expect(payments.length).toBe(1);
    expect(payments[0].gateway).toBe('RAZORPAY');
    expect(payments[0].gatewayPaymentId).toBe('pay_TESTA1');

    const after = await FeeInvoice.findById(ctx.a.invoiceId).lean();
    expect(after.status).toBe('PAID');
    expect(after.balanceAmount).toBe(0);
    expect(after.paidAmount).toBe(8000);
  });

  it('a non-SCHOOL_FEE entity is ignored by the reconciler', async () => {
    const res = await parentFeePaymentService.reconcileFromRazorpay({ id: 'pay_x', amount: 100, notes: { type: 'OTHER' } });
    expect(res.handled).toBe(false);
  });

  it('the reconciled payment now shows in the parent’s history + receipts', async () => {
    const hist = await request(app).get(`${kidA()}/fees/history`).set(auth(ctx.a.parentToken));
    expect(hist.body.data.some((p) => p.receiptNumber && p.amount === 8000)).toBe(true);

    const receipts = await request(app).get(`${kidA()}/fees/receipts`).set(auth(ctx.a.parentToken));
    expect(receipts.body.data.length).toBe(1);
    expect(receipts.body.data[0].transactionId).toBe('pay_TESTA1');
    expect(receipts.body.data[0].invoice.status).toBe('PAID');
  });
});
