import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let FeePayment;
let FeeInvoice;
let Receipt;
let FinanceTransaction;
let parentFeePaymentService;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const admin = () => auth(ctx.a.adminToken);
const pay = (body) => request(app).post(`/school-portal/fees/invoices/${ctx.a.invoiceId}/pay`).set(admin()).send(body);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ FeePayment } = await import('../src/models/FeePayment.js'));
  ({ FeeInvoice } = await import('../src/models/FeeInvoice.js'));
  ({ Receipt } = await import('../src/models/Receipt.js'));
  ({ FinanceTransaction } = await import('../src/models/FinanceTransaction.js'));
  ({ parentFeePaymentService } = await import('../src/services/parentFeePayment.service.js'));
}, 120000);
afterAll(disconnect);

describe('Refund / cancel a fee payment', () => {
  let p1;

  it('partial refund reopens the invoice balance and writes a Fee Refunds expense', async () => {
    const res = await pay({ amount: 5000, paymentMethod: 'CASH' });
    expect(res.status).toBe(201);
    p1 = res.body.data;

    const bad = await request(app).post(`/school-portal/fees/payments/${p1.id}/refund`).set(admin()).send({ amount: 2000 });
    expect(bad.status).toBe(400); // reason required

    const r = await request(app)
      .post(`/school-portal/fees/payments/${p1.id}/refund`)
      .set(admin())
      .send({ amount: 2000, reason: 'Charged twice', method: 'CASH' });
    expect(r.status).toBe(200);
    expect(r.body.data.payment.status).toBe('COMPLETED');
    expect(r.body.data.payment.refundedAmount).toBe(2000);
    expect(r.body.data.payment.appliedAmount).toBe(3000);
    expect(r.body.data.invoice).toMatchObject({ paidAmount: 3000, balanceAmount: 5000, status: 'PARTIALLY_PAID' });

    const txn = await FinanceTransaction.findOne({ referenceNo: `REFUND:${p1.receiptNumber}` }).lean();
    expect(txn.transactionType).toBe('EXPENSE');
    expect(txn.amount).toBe(2000);
    const receipt = await Receipt.findById(p1.receiptId).lean();
    expect(receipt.status).toBe('ACTIVE'); // still partly valid

    const over = await request(app)
      .post(`/school-portal/fees/payments/${p1.id}/refund`)
      .set(admin())
      .send({ amount: 3001, reason: 'x' });
    expect(over.status).toBe(400);
  });

  it('full cancel voids the receipt, marks the payment CANCELLED and writes a reversal', async () => {
    const r = await request(app)
      .post(`/school-portal/fees/payments/${p1.id}/refund`)
      .set(admin())
      .send({ kind: 'CANCEL', reason: 'Entered on wrong student' });
    expect(r.status).toBe(200);
    expect(r.body.data.payment.status).toBe('CANCELLED');
    expect(r.body.data.payment.refundedAmount).toBe(5000);
    expect(r.body.data.invoice).toMatchObject({ paidAmount: 0, balanceAmount: 8000, status: 'PENDING' });
    const receipt = await Receipt.findById(p1.receiptId).lean();
    expect(receipt.status).toBe('VOID');
    const rev = await FinanceTransaction.findOne({ referenceNo: `CANCEL:${p1.receiptNumber}` }).lean();
    expect(rev.amount).toBe(3000); // only what was still applied

    const again = await request(app).post(`/school-portal/fees/payments/${p1.id}/refund`).set(admin()).send({ reason: 'x' });
    expect(again.status).toBe(400);
  });

  it('refunding an online overpayment refunds the excess first and leaves the invoice PAID', async () => {
    await pay({ amount: 7000, paymentMethod: 'UPI' });
    const before = await FeeInvoice.findById(ctx.a.invoiceId).lean();
    expect(before.balanceAmount).toBe(1000);
    const res = await parentFeePaymentService.reconcileFromRazorpay({
      id: 'pay_refund_over',
      order_id: 'order_refund_over',
      amount: 150000,
      notes: { type: 'SCHOOL_FEE', schoolId: String(before.schoolId), invoiceId: ctx.a.invoiceId, studentId: ctx.a.studentId },
    });
    expect(res.overpaid).toBe(500);
    const online = await FeePayment.findOne({ gatewayPaymentId: 'pay_refund_over' }).lean();

    const r = await request(app)
      .post(`/school-portal/accountant/receipts/${online._id}/refund`)
      .set(admin())
      .send({ amount: 500, reason: 'Overpayment refund', method: 'UPI' });
    expect(r.status).toBe(200);
    expect(r.body.data.refund).toMatchObject({ fromOverpaid: 500, fromApplied: 0 });
    expect(r.body.data.invoice).toMatchObject({ paidAmount: 8000, balanceAmount: 0, status: 'PAID' });
    const after = await FeePayment.findById(online._id).lean();
    expect(after.overpaidAmount).toBe(0);
    expect(after.status).toBe('COMPLETED');
  });
});
