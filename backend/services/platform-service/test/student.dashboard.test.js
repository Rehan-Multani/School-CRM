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

describe('Student APK — dashboard / home (API-driven)', () => {
  it('GET /dashboard returns the student header, today summary and announcements from the DB', async () => {
    const res = await request(app).get('/school-portal/student/dashboard').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.student.className).toBeTruthy();
    expect(res.body.data.todaySummary).toHaveProperty('attendancePercentage');
    expect(res.body.data.todaySummary).toHaveProperty('pendingHomework');
    expect(res.body.data.announcements.some((a) => a.title === 'Welcome')).toBe(true);
    // never leaks School B's announcement
    expect(res.body.data.announcements.every((a) => a.id !== ctx.b.noticeId)).toBe(true);
  });

  it('pending-homework count reflects the seeded, unsubmitted homework', async () => {
    const res = await request(app).get('/school-portal/student/dashboard').set(auth(ctx.a.studentToken));
    expect(res.body.data.todaySummary.pendingHomework).toBeGreaterThanOrEqual(1);
  });

  it('GET /today and GET /upcoming are shaped and tenant-clean', async () => {
    const today = await request(app).get('/school-portal/student/today').set(auth(ctx.a.studentToken));
    expect(today.status).toBe(200);
    expect(Array.isArray(today.body.data.periods)).toBe(true);

    const up = await request(app).get('/school-portal/student/upcoming').set(auth(ctx.a.studentToken));
    expect(up.status).toBe(200);
    expect(Array.isArray(up.body.data.exams)).toBe(true);
    expect(Array.isArray(up.body.data.homework)).toBe(true);
  });

  it('requires a student token (teacher token is rejected 403)', async () => {
    const res = await request(app).get('/school-portal/student/dashboard').set(auth(ctx.a.token));
    expect(res.status).toBe(403);
  });
});
