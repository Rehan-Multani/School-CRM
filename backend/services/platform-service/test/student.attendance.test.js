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

describe('Student APK — attendance (read-only, own entries only)', () => {
  it('GET /attendance/summary counts only THIS student\'s entries', async () => {
    const res = await request(app).get('/school-portal/student/attendance/summary').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    // seed: this student PRESENT once; the other student's ABSENT must not count
    expect(res.body.data.overall.total).toBe(1);
    expect(res.body.data.overall.PRESENT).toBe(1);
    expect(res.body.data.overall.ABSENT).toBe(0);
    expect(res.body.data.overall.presentPercentage).toBe(100);
  });

  it('GET /attendance/daily returns day rows with a status', async () => {
    const res = await request(app).get('/school-portal/student/attendance/daily').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.days.length).toBe(1);
    expect(res.body.data.days[0].status).toBe('PRESENT');
  });

  it('GET /attendance/monthly validates the month param', async () => {
    const bad = await request(app).get('/school-portal/student/attendance/monthly?month=2026').set(auth(ctx.a.studentToken));
    expect(bad.status).toBe(400);
    const month = new Date().toISOString().slice(0, 7);
    const ok = await request(app).get(`/school-portal/student/attendance/monthly?month=${month}`).set(auth(ctx.a.studentToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.month).toBe(month);
  });

  it('there is no write route for student attendance', async () => {
    const res = await request(app)
      .post('/school-portal/student/attendance')
      .set(auth(ctx.a.studentToken))
      .send({ date: '2026-01-01', status: 'PRESENT' });
    expect([404, 405]).toContain(res.status);
  });
});
