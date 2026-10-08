import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

/**
 * Fee ledger: every payment path (accountant/admin "pay invoice", admin
 * assignment "collect", parent-app Razorpay webhook) writes FeePayment +
 * Receipt + FinanceTransaction, with sequential receipt numbers, an atomic
 * overpayment guard, and auto-assigned fee components for new students.
 */
let app;
let ctx;
let FeePayment;
let Receipt;
let FinanceTransaction;
let FeeInvoice;
let StudentFeeAssignment;
let parentFeePaymentService;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ FeePayment } = await import('../src/models/FeePayment.js'));
  ({ Receipt } = await import('../src/models/Receipt.js'));
  ({ FinanceTransaction } = await import('../src/models/FinanceTransaction.js'));
  ({ FeeInvoice } = await import('../src/models/FeeInvoice.js'));
  ({ StudentFeeAssignment } = await import('../src/models/StudentFeeAssignment.js'));
  ({ parentFeePaymentService } = await import('../src/services/parentFeePayment.service.js'));
}, 60000);
afterAll(disconnect);

const admin = () => auth(ctx.a.adminToken);
const pay = (invoiceId, body) => request(app).post(`/school-portal/fees/invoices/${invoiceId}/pay`).set(admin()).send(body);

describe('Fee ledger — one path for every payment', () => {
  it('paying an invoice writes FeePayment + Receipt + FinanceTransaction with one receipt number', async () => {
    const res = await pay(ctx.a.invoiceId, { amount: 3000, paymentMethod: 'CASH', paymentReference: 'R1' });
    expect(res.status).toBe(201);
    const p = res.body.data;
    expect(p.status).toBe('COMPLETED');
    expect(p.receiptNumber).toMatch(/^REC-\d{4}-\d{5}$/);
    expect(p.receiptId).toBeTruthy();
    expect(p.financeTransactionId).toBeTruthy();

    const receipt = await Receipt.findById(p.receiptId).lean();
    expect(receipt.receiptNumber).toBe(p.receiptNumber);
    expect(receipt.paidAmount).toBe(3000);
    expect(receipt.remainingDue).toBe(5000);
    expect(String(receipt.invoiceId)).toBe(ctx.a.invoiceId);

    const txn = await FinanceTransaction.findById(p.financeTransactionId).lean();
    expect(txn.transactionType).toBe('INCOME');
    expect(txn.amount).toBe(3000);
    expect(txn.referenceNo).toBe(p.receiptNumber);

    const inv = await FeeInvoice.findById(ctx.a.invoiceId).lean();
    expect(inv.paidAmount).toBe(3000);
    expect(inv.balanceAmount).toBe(5000);
    expect(inv.status).toBe('PARTIALLY_PAID');
  });

  it('receipt numbers are sequential and never reused', async () => {
    const a = await pay(ctx.a.invoiceId, { amount: 1000, paymentMethod: 'UPI' });
    const b = await pay(ctx.a.invoiceId, { amount: 1000, paymentMethod: 'UPI' });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const n = (x) => Number(x.body.data.receiptNumber.split('-').pop());
    expect(n(b)).toBe(n(a) + 1);
    const all = await FeePayment.find({ invoiceId: ctx.a.invoiceId }).lean();
    const numbers = all.map((r) => r.receiptNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('rejects overpayment, and two concurrent collections cannot exceed the balance', async () => {
    const inv = await FeeInvoice.findById(ctx.a.invoiceId).lean();
    expect(inv.balanceAmount).toBe(3000);
    const over = await pay(ctx.a.invoiceId, { amount: 3001, paymentMethod: 'CASH' });
    expect(over.status).toBe(400);

    // Two simultaneous 2000s on a 3000 balance: exactly one may succeed.
    const [r1, r2] = await Promise.all([
      pay(ctx.a.invoiceId, { amount: 2000, paymentMethod: 'CASH' }),
      pay(ctx.a.invoiceId, { amount: 2000, paymentMethod: 'CASH' }),
    ]);
    const ok = [r1, r2].filter((r) => r.status === 201).length;
    expect(ok).toBe(1);
    const after = await FeeInvoice.findById(ctx.a.invoiceId).lean();
    expect(after.paidAmount).toBe(7000);
    expect(after.balanceAmount).toBe(1000);
    // the failed attempt left nothing behind
    const payments = await FeePayment.countDocuments({ invoiceId: ctx.a.invoiceId, status: 'COMPLETED' });
    const receipts = await Receipt.countDocuments({ invoiceId: ctx.a.invoiceId });
    expect(receipts).toBe(payments);
  });

  it('webhook payment goes through the same ledger; excess over the balance is recorded as overpaid, not lost', async () => {
    const before = await FeeInvoice.findById(ctx.a.invoiceId).lean();
    expect(before.balanceAmount).toBe(1000);
    // Parent pays 1500 online while only 1000 is owed (cash landed in between).
    const entity = {
      id: 'pay_ledger_1',
      order_id: 'order_ledger_1',
      amount: 150000,
      notes: { type: 'SCHOOL_FEE', schoolId: String(before.schoolId), invoiceId: ctx.a.invoiceId, studentId: ctx.a.studentId },
    };
    const res = await parentFeePaymentService.reconcileFromRazorpay(entity);
    expect(res.handled).toBe(true);
    expect(res.invoiceStatus).toBe('PAID');
    expect(res.overpaid).toBe(500);

    const payment = await FeePayment.findOne({ gatewayPaymentId: 'pay_ledger_1' }).lean();
    expect(payment.receiptNumber).toMatch(/^REC-/);
    expect(payment.overpaidAmount).toBe(500);
    expect(payment.receiptId).toBeTruthy();
    expect(payment.financeTransactionId).toBeTruthy();

    const inv = await FeeInvoice.findById(ctx.a.invoiceId).lean();
    expect(inv.status).toBe('PAID');
    expect(inv.balanceAmount).toBe(0);

    // replay is a no-op
    const again = await parentFeePaymentService.reconcileFromRazorpay(entity);
    expect(again.alreadyProcessed).toBe(true);
    expect(await FeePayment.countDocuments({ gatewayPaymentId: 'pay_ledger_1' })).toBe(1);
  });

  it('a PAID invoice refuses further payments', async () => {
    const res = await pay(ctx.a.invoiceId, { amount: 10, paymentMethod: 'CASH' });
    expect(res.status).toBe(400);
  });
});

describe('Fee assignment → invoice', () => {
  let structureId;
  let newStudentId;

  it('fee structure with items can be configured for the class', async () => {
    const head = await request(app).post('/school-portal/fees/heads').set(admin()).send({ name: 'Tuition', code: 'TUI' });
    expect(head.status).toBe(201);
    const head2 = await request(app).post('/school-portal/fees/heads').set(admin()).send({ name: 'Library', code: 'LIB' });
    const struct = await request(app)
      .post('/school-portal/fees/structures')
      .set(admin())
      .send({ classId: ctx.a.classId, academicYearId: ctx.a.yearId, name: 'Class 10 fees' });
    expect(struct.status).toBe(201);
    structureId = struct.body.data.id;
    const it1 = await request(app)
      .post(`/school-portal/fees/structures/${structureId}/items`)
      .set(admin())
      .send({ feeHeadId: head.body.data.id, amount: 5000.5, frequency: 'YEARLY' });
    expect(it1.status).toBe(201);
    const it2 = await request(app)
      .post(`/school-portal/fees/structures/${structureId}/items`)
      .set(admin())
      .send({ feeHeadId: head2.body.data.id, amount: 499.5, frequency: 'YEARLY' });
    expect(it2.status).toBe(201);
  });

  it('a newly created student is auto-assigned the class fee components', async () => {
    const res = await request(app)
      .post('/school-portal/students')
      .set(admin())
      .send({
        firstName: 'Auto',
        lastName: 'Fees',
        gender: 'FEMALE',
        dateOfBirth: '2012-05-05',
        admissionNumber: 'ADM-AUTO-1',
        academicYearId: ctx.a.yearId,
        classId: ctx.a.classId,
        sectionId: ctx.a.sectionId,
        parentName: 'Guardian',
        parentPhone: '9876501234',
        status: 'ACTIVE',
      });
    expect(res.status).toBe(201);
    newStudentId = res.body.data.id;
    const rows = await StudentFeeAssignment.find({ studentId: newStudentId }).lean();
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'ACTIVE' && r.enrollmentId && r.feeStructureItemId)).toBe(true);
  });

  it('auto-assign is idempotent (running it again does not double the dues)', async () => {
    const enrollment = (await import('../src/models/StudentEnrollment.js')).StudentEnrollment;
    const enr = await enrollment.findOne({ studentId: newStudentId }).lean();
    const res = await request(app)
      .post(`/school-portal/fees/students/${newStudentId}/auto-assign`)
      .set(admin())
      .send({ enrollmentId: String(enr._id), classId: ctx.a.classId, academicYearId: ctx.a.yearId });
    expect(res.status).toBe(201);
    expect(await StudentFeeAssignment.countDocuments({ studentId: newStudentId })).toBe(2);
  });

  it('an invoice can be generated and paid for that student; an existing student without assignments is self-healed', async () => {
    const gen = await request(app)
      .post('/school-portal/fees/invoices/generate')
      .set(admin())
      .send({ studentId: newStudentId, periodLabel: 'Annual' });
    expect(gen.status).toBe(201);
    expect(gen.body.data.totalAmount).toBe(5500);
    expect(gen.body.data.invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/);

    // Seeded student (created before any structure existed) has no assignments.
    expect(await StudentFeeAssignment.countDocuments({ studentId: ctx.a.studentId })).toBe(0);
    const gen2 = await request(app)
      .post('/school-portal/fees/invoices/generate')
      .set(admin())
      .send({ studentId: ctx.a.studentId, periodLabel: 'Annual' });
    expect(gen2.status).toBe(201);
    expect(gen2.body.data.totalAmount).toBe(5500);
    expect(await StudentFeeAssignment.countDocuments({ studentId: ctx.a.studentId })).toBe(2);

    // duplicate period is refused
    const dup = await request(app)
      .post('/school-portal/fees/invoices/generate')
      .set(admin())
      .send({ studentId: ctx.a.studentId, periodLabel: 'Annual' });
    expect(dup.status).toBe(409);
  });
});
