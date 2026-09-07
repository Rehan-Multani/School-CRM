import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const kidA = () => `/school-portal/parent/children/${ctx.a.studentId}`;

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Parent APK — attendance for the linked child (read-only)', () => {
  it('summary counts only THIS child’s entries', async () => {
    const res = await request(app).get(`${kidA()}/attendance/summary`).set(auth(ctx.a.parentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.overall.total).toBe(1);
    expect(res.body.data.overall.PRESENT).toBe(1);
    expect(res.body.data.overall.presentPercentage).toBe(100);
  });

  it('daily returns day rows; monthly validates the month param', async () => {
    const daily = await request(app).get(`${kidA()}/attendance/daily`).set(auth(ctx.a.parentToken));
    expect(daily.body.data.days[0].status).toBe('PRESENT');

    const badMonth = await request(app).get(`${kidA()}/attendance/monthly?month=2026`).set(auth(ctx.a.parentToken));
    expect(badMonth.status).toBe(400);
    const month = new Date().toISOString().slice(0, 7);
    const okMonth = await request(app).get(`${kidA()}/attendance/monthly?month=${month}`).set(auth(ctx.a.parentToken));
    expect(okMonth.body.data.month).toBe(month);
  });

  it('there is no attendance write route for a parent', async () => {
    const res = await request(app)
      .post(`${kidA()}/attendance`)
      .set(auth(ctx.a.parentToken))
      .send({ date: '2026-01-01', status: 'PRESENT' });
    expect([404, 405]).toContain(res.status);
  });
});
