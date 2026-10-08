import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

/**
 * Money outside the fee module reaches the accountant ledger:
 *   payroll PAID       → Expense (Salary) + FinanceTransaction EXPENSE
 *   library fine PAID  → FinanceTransaction INCOME (Library Fines)
 * Both idempotent, both visible in /accountant/transactions.
 */
let app;
let ctx;
let Expense;
let FinanceTransaction;
let LibraryIssue;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const admin = () => auth(ctx.a.adminToken);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  ({ Expense } = await import('../src/models/Expense.js'));
  ({ FinanceTransaction } = await import('../src/models/FinanceTransaction.js'));
  ({ LibraryIssue } = await import('../src/models/LibraryIssue.js'));
}, 120000);
afterAll(disconnect);

describe('Payroll → accountant ledger', () => {
  let payrollId;

  it('a PROCESSED payroll creates no expense; marking it PAID creates exactly one Salary expense + ledger row', async () => {
    const create = await request(app)
      .post('/school-portal/hr/payroll')
      .set(admin())
      .send({
        employeeRefId: ctx.a.teacherId,
        employeeType: 'TEACHER',
        payrollMonth: 'September 2026',
        basicSalary: 30000,
        allowances: 4500,
        leaveDeduction: 2000,
        paymentStatus: 'PROCESSED',
        paymentMethod: 'BANK_TRANSFER',
      });
    expect(create.status).toBe(201);
    payrollId = create.body.data.id;
    expect(create.body.data.netSalary).toBe(32500);
    expect(await Expense.countDocuments({ reference: `PAYROLL:${payrollId}` })).toBe(0);

    const paid = await request(app)
      .patch(`/school-portal/hr/payroll/${payrollId}/status`)
      .set(admin())
      .send({ status: 'PAID', transactionRef: 'NEFT123' });
    expect(paid.status).toBe(200);

    const expenses = await Expense.find({ reference: `PAYROLL:${payrollId}` }).lean();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].category).toBe('Salary');
    expect(expenses[0].amount).toBe(32500);
    expect(expenses[0].paymentStatus).toBe('PAID');
    expect(expenses[0].paymentMethod).toBe('NET_BANKING');
    expect(expenses[0].expenseNumber).toMatch(/^EXP-\d{4}-\d{5}$/);

    const ledger = await FinanceTransaction.find({ referenceNo: expenses[0].expenseNumber }).lean();
    expect(ledger).toHaveLength(1);
    expect(ledger[0].transactionType).toBe('EXPENSE');
    expect(ledger[0].amount).toBe(32500);

    // re-marking PAID (or any replay) does not duplicate
    await request(app).patch(`/school-portal/hr/payroll/${payrollId}/status`).set(admin()).send({ status: 'PAID' });
    expect(await Expense.countDocuments({ reference: `PAYROLL:${payrollId}` })).toBe(1);
  });

  it('release-all links every released record', async () => {
    const create = await request(app)
      .post('/school-portal/hr/payroll')
      .set(admin())
      .send({ employeeRefId: ctx.a.teacherId, employeeType: 'TEACHER', payrollMonth: 'October 2026', basicSalary: 10000, paymentStatus: 'PROCESSED' });
    expect(create.status).toBe(201);
    const rel = await request(app).post('/school-portal/hr/payroll/release').set(admin()).send({ month: 'October 2026' });
    expect(rel.status).toBe(200);
    expect(await Expense.countDocuments({ reference: `PAYROLL:${create.body.data.id}` })).toBe(1);
  });

  it('the accountant sees the salary in transactions and expense totals', async () => {
    const res = await request(app).get('/school-portal/accountant/transactions?type=EXPENSE&limit=50').set(admin());
    expect(res.status).toBe(200);
    const salary = res.body.data.find((t) => t.category === 'Salary' && t.amount === 32500);
    expect(salary).toBeTruthy();
    expect(salary.direction).toBe('DEBIT');
  });
});

describe('Library fine → accountant ledger', () => {
  let issueId;

  it('an overdue return with a PAID fine creates one INCOME ledger row', async () => {
    const book = await request(app)
      .post('/school-portal/library/books')
      .set(admin())
      .send({ title: 'Ledger Book', author: 'A. Author', totalCopies: 1, price: 300 });
    expect(book.status).toBe(201);
    const issue = await request(app)
      .post('/school-portal/library/issues')
      .set(admin())
      .send({ bookId: book.body.data.id, borrowerRefId: ctx.a.studentId, borrowerType: 'STUDENT', borrowerName: 'Sam Student' });
    expect(issue.status).toBe(201);
    issueId = issue.body.data.id;

    // make it 10 days overdue
    await LibraryIssue.updateOne({ _id: issueId }, { $set: { dueDate: new Date(Date.now() - 10 * 86400000) } });

    const ret = await request(app).post(`/school-portal/library/issues/${issueId}/return`).set(admin()).send({ fineStatus: 'PAID' });
    expect(ret.status).toBe(200);
    expect(ret.body.data.fineAmount).toBeGreaterThan(0);
    expect(ret.body.data.fineStatus).toBe('PAID');

    const rows = await FinanceTransaction.find({ referenceNo: `LIBFINE:${issueId}` }).lean();
    expect(rows).toHaveLength(1);
    expect(rows[0].transactionType).toBe('INCOME');
    expect(rows[0].amount).toBe(ret.body.data.fineAmount);
  });

  it('a PENDING fine is linked only when it is later marked PAID, once', async () => {
    const book = await request(app)
      .post('/school-portal/library/books')
      .set(admin())
      .send({ title: 'Ledger Book 2', author: 'A. Author', totalCopies: 1 });
    const issue = await request(app)
      .post('/school-portal/library/issues')
      .set(admin())
      .send({ bookId: book.body.data.id, borrowerRefId: ctx.a.studentNoGuardianId, borrowerType: 'STUDENT', borrowerName: 'Nomo Guardian' });
    expect(issue.status).toBe(201);
    const id = issue.body.data.id;
    await LibraryIssue.updateOne({ _id: id }, { $set: { dueDate: new Date(Date.now() - 5 * 86400000) } });
    const ret = await request(app).post(`/school-portal/library/issues/${id}/return`).set(admin()).send({ fineStatus: 'PENDING' });
    expect(ret.status).toBe(200);
    expect(await FinanceTransaction.countDocuments({ referenceNo: `LIBFINE:${id}` })).toBe(0);

    const paid = await request(app).patch(`/school-portal/library/issues/${id}/fine`).set(admin()).send({ fineStatus: 'PAID' });
    expect(paid.status).toBe(200);
    expect(await FinanceTransaction.countDocuments({ referenceNo: `LIBFINE:${id}` })).toBe(1);
  });

  it('the accountant sees library fines as OTHER_INCOME, with a detail view', async () => {
    const res = await request(app).get('/school-portal/accountant/transactions?type=INCOME&limit=50').set(admin());
    expect(res.status).toBe(200);
    const fine = res.body.data.find((t) => t.type === 'OTHER_INCOME' && t.category === 'Library Fines');
    expect(fine).toBeTruthy();
    expect(fine.direction).toBe('CREDIT');
    const detail = await request(app).get(`/school-portal/accountant/transactions/${fine.id}?type=OTHER_INCOME`).set(admin());
    expect(detail.status).toBe(200);
    expect(detail.body.data.amount).toBe(fine.amount);
  });
});
