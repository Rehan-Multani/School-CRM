import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

// The fee-due filters the admin screens rely on: due-date window, "owes at least",
// overdue-only, class — on the invoice list and on the Fee Dues report.
let app;
let ctx;

const get = (path) => request(app).get(path).set('Authorization', `Bearer ${ctx.a.adminToken}`);
const day = (offset) => new Date(Date.now() + offset * 86400000);
const iso = (d) => d.toISOString().slice(0, 10);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();

  const { FeeInvoice } = await import('../src/models/FeeInvoice.js');
  const { StudentEnrollment } = await import('../src/models/StudentEnrollment.js');
  const enrollment = await StudentEnrollment.findOne({ schoolId: ctx.a.schoolId, studentId: ctx.a.studentId });
  // Past due and still owing (stored status lags the calendar: PENDING, not OVERDUE).
  await FeeInvoice.create({
    schoolId: new mongoose.Types.ObjectId(ctx.a.schoolId),
    studentId: new mongoose.Types.ObjectId(ctx.a.studentId),
    enrollmentId: enrollment._id,
    academicYearId: new mongoose.Types.ObjectId(ctx.a.yearId),
    invoiceNumber: 'INV-FILTER-OVERDUE',
    periodLabel: 'Term 0',
    periodStart: day(-90),
    periodEnd: day(-30),
    dueDate: day(-5),
    items: [{ feeHeadName: 'Tuition Fee', originalAmount: 3000, discountAmount: 0, finalAmount: 3000 }],
    totalAmount: 3000,
    paidAmount: 0,
    balanceAmount: 3000,
    status: 'PENDING',
  });
}, 120000);

afterAll(disconnect);

describe('Fee invoice list filters', () => {
  it('overdue=true returns only unpaid invoices already past due', async () => {
    const res = await get('/school-portal/fees/invoices?overdue=true&limit=100');
    expect(res.status).toBe(200);
    const numbers = res.body.data.map((i) => i.invoiceNumber);
    expect(numbers).toContain('INV-FILTER-OVERDUE');
    expect(numbers).not.toContain(`INV-${ctx.a.studentLoginEmail.split('@')[1].split('.')[0].toUpperCase()}-1`);
    res.body.data.forEach((i) => expect(new Date(i.dueDate) < new Date()).toBe(true));
  });

  it('minBalance keeps only invoices owing at least that much', async () => {
    const res = await get('/school-portal/fees/invoices?minBalance=5000&limit=100');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((i) => expect(i.balanceAmount).toBeGreaterThanOrEqual(5000));
  });

  it('dueFrom / dueTo window', async () => {
    const res = await get(`/school-portal/fees/invoices?dueFrom=${iso(day(-10))}&dueTo=${iso(day(-1))}&limit=100`);
    expect(res.status).toBe(200);
    const numbers = res.body.data.map((i) => i.invoiceNumber);
    expect(numbers).toEqual(['INV-FILTER-OVERDUE']);
  });

  it('classId narrows to that class and carries className on each row', async () => {
    const inClass = await get(`/school-portal/fees/invoices?classId=${ctx.a.classId}&limit=100`);
    expect(inClass.status).toBe(200);
    expect(inClass.body.data.length).toBeGreaterThan(0);
    expect(inClass.body.data.every((i) => i.className)).toBe(true);

    const other = await get(`/school-portal/fees/invoices?classId=${new mongoose.Types.ObjectId()}&limit=100`);
    expect(other.body.data).toHaveLength(0);
  });
});

describe('Fee Dues report', () => {
  it('startDate / endDate filter on the due date', async () => {
    const res = await get(
      `/school-portal/reports/data?category=fee_dues&startDate=${iso(day(-10))}&endDate=${iso(day(-1))}`
    );
    expect(res.status).toBe(200);
    const nums = res.body.data.map((r) => r['Invoice No']);
    expect(nums).toEqual(['INV-FILTER-OVERDUE']);
  });
});

describe('Accountant dues filters (applied before paging, not after)', () => {
  it('status=Overdue returns only past-due invoices and the total counts them all', async () => {
    const res = await get('/school-portal/accountant/dues?status=Overdue&limit=100');
    expect(res.status).toBe(200);
    expect(res.body.data.map((r) => r.invoiceNumber)).toEqual(['INV-FILTER-OVERDUE']);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.data[0].status).toBe('Overdue');
  });

  it('status=Pending excludes the past-due one', async () => {
    const res = await get('/school-portal/accountant/dues?status=Pending&limit=100');
    expect(res.status).toBe(200);
    const numbers = res.body.data.map((r) => r.invoiceNumber);
    expect(numbers).not.toContain('INV-FILTER-OVERDUE');
    expect(numbers.length).toBeGreaterThan(0);
    expect(res.body.pagination.total).toBe(numbers.length);
  });

  it('minPending and the due-date window narrow the list', async () => {
    const min = await get('/school-portal/accountant/dues?minPending=5000&limit=100');
    expect(min.status).toBe(200);
    min.body.data.forEach((r) => expect(r.pendingAmount).toBeGreaterThanOrEqual(5000));
    expect(min.body.data.map((r) => r.invoiceNumber)).not.toContain('INV-FILTER-OVERDUE');

    const win = await get(`/school-portal/accountant/dues?dueFrom=${iso(day(-10))}&dueTo=${iso(day(-1))}&limit=100`);
    expect(win.body.data.map((r) => r.invoiceNumber)).toEqual(['INV-FILTER-OVERDUE']);
  });
});

describe('Student list fee filters', () => {
  it('feeStatus=DUE lists only students who owe, with their total due', async () => {
    const res = await get('/school-portal/students?feeStatus=DUE&limit=100&page=1');
    expect(res.status).toBe(200);
    const row = res.body.data.find((s) => s.id === ctx.a.studentId);
    expect(row).toBeTruthy();
    expect(row.feeDue).toBeGreaterThan(0);
    expect(row.feeOverdue).toBeGreaterThan(0); // the past-due invoice
    expect(res.body.data.map((s) => s.id)).not.toContain(ctx.a.studentNoGuardianId);
  });

  it('feeStatus=CLEAR excludes students with dues', async () => {
    const res = await get('/school-portal/students?feeStatus=CLEAR&limit=100&page=1');
    expect(res.status).toBe(200);
    expect(res.body.data.map((s) => s.id)).not.toContain(ctx.a.studentId);
  });

  it('minDue narrows to students owing at least that much', async () => {
    const hit = await get('/school-portal/students?minDue=1000&limit=100&page=1');
    expect(hit.body.data.map((s) => s.id)).toContain(ctx.a.studentId);
    const miss = await get('/school-portal/students?minDue=999999&limit=100&page=1');
    expect(miss.body.data).toHaveLength(0);
  });
});
