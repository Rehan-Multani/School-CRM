import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Student APK — fees (read-only)', () => {
  it('GET /fees/summary totals my invoices', async () => {
    const res = await request(app).get('/school-portal/student/fees/summary').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.totalFees).toBe(8000);
    expect(res.body.data.pending).toBe(8000);
    expect(res.body.data.nextDueDate).toBeTruthy();
  });

  it('GET /fees/invoices lists my invoices and /:id shows the breakdown', async () => {
    const list = await request(app).get('/school-portal/student/fees/invoices').set(auth(ctx.a.studentToken));
    expect(list.status).toBe(200);
    expect(list.body.data.some((i) => i.id === ctx.a.invoiceId)).toBe(true);

    const one = await request(app).get(`/school-portal/student/fees/invoices/${ctx.a.invoiceId}`).set(auth(ctx.a.studentToken));
    expect(one.status).toBe(200);
    expect(one.body.data.items[0].feeHeadName).toBe('Tuition Fee');
  });

  it('cannot read another school\'s invoice (404)', async () => {
    const res = await request(app)
      .get(`/school-portal/student/fees/invoices/${ctx.b.invoiceId}`)
      .set(auth(ctx.a.studentToken));
    expect(res.status).toBe(404);
  });

  it('there is no payment route', async () => {
    const res = await request(app)
      .post(`/school-portal/student/fees/invoices/${ctx.a.invoiceId}/pay`)
      .set(auth(ctx.a.studentToken))
      .send({ amount: 100 });
    expect([404, 405]).toContain(res.status);
  });
});
