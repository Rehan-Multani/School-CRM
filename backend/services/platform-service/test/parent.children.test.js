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

describe('Parent APK — children + home', () => {
  it('GET /children lists only the linked child(ren)', async () => {
    const res = await request(app).get('/school-portal/parent/children').set(auth(ctx.a.parentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].childId).toBe(ctx.a.studentId);
    expect(res.body.data[0].className).toBeTruthy();
    // the un-linked studentNoGuardian must not appear
    expect(res.body.data.every((c) => c.childId !== ctx.a.studentNoGuardianId)).toBe(true);
  });

  it('GET /children/:childId for an unlinked child → 403 CHILD_ACCESS_DENIED', async () => {
    const res = await request(app)
      .get(`/school-portal/parent/children/${ctx.a.studentNoGuardianId}`)
      .set(auth(ctx.a.parentToken));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CHILD_ACCESS_DENIED');
  });

  it('GET /dashboard for the linked child is API-driven', async () => {
    const res = await request(app)
      .get(`/school-portal/parent/dashboard?childId=${ctx.a.studentId}`)
      .set(auth(ctx.a.parentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.child.childId).toBe(ctx.a.studentId);
    expect(res.body.data.todaySummary).toHaveProperty('attendancePercentage');
    expect(res.body.data.todaySummary).toHaveProperty('pendingHomework');
    expect(res.body.data.pendingFees).toHaveProperty('amount');
    expect(res.body.data).toHaveProperty('recentNotices');
  });

  it('GET /dashboard/overview rolls up every linked child', async () => {
    const res = await request(app).get('/school-portal/parent/dashboard/overview').set(auth(ctx.a.parentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.children.length).toBe(1);
    expect(res.body.data.children[0].childId).toBe(ctx.a.studentId);
  });

  it('a parent with a child in another school cannot pass that childId', async () => {
    const res = await request(app)
      .get(`/school-portal/parent/dashboard?childId=${ctx.b.studentId}`)
      .set(auth(ctx.a.parentToken));
    expect(res.status).toBe(403);
  });
});
