import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp, badToken } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Parent APK — IDOR / BOLA / cross-school / RBAC', () => {
  it('every /school-portal/parent/* route needs a token (401)', async () => {
    for (const p of ['/me', '/children', '/dashboard/overview', '/notices', '/notifications', '/profile']) {
      expect((await request(app).get(`/school-portal/parent${p}`)).status, p).toBe(401);
    }
  });

  it('a bad token → 401; a STUDENT token → 403; a TEACHER token → 403; a SchoolAdmin token → 403', async () => {
    expect((await request(app).get('/school-portal/parent/children').set({ Authorization: badToken })).status).toBe(401);
    expect((await request(app).get('/school-portal/parent/children').set(auth(ctx.a.studentToken))).status).toBe(403);
    expect((await request(app).get('/school-portal/parent/children').set(auth(ctx.a.token))).status).toBe(403);
    expect((await request(app).get('/school-portal/parent/children').set(auth(ctx.a.adminToken))).status).toBe(403);
  });

  it('parent A cannot touch parent B’s child on ANY child-scoped route', async () => {
    const t = auth(ctx.a.parentToken);
    const childB = `/school-portal/parent/children/${ctx.b.studentId}`;
    for (const path of [`${childB}`, `${childB}/homework`, `${childB}/attendance/summary`, `${childB}/results`, `${childB}/fees/summary`, `${childB}/pickup`]) {
      const res = await request(app).get(path).set(t);
      expect(res.status, path).toBe(403);
      if (res.body.code) expect(res.body.code).toBe('CHILD_ACCESS_DENIED');
    }
  });

  it('a child the parent is NOT linked to in their OWN school → 403', async () => {
    const res = await request(app)
      .get(`/school-portal/parent/children/${ctx.a.studentNoGuardianId}/attendance/summary`)
      .set(auth(ctx.a.parentToken));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CHILD_ACCESS_DENIED');
  });

  it('a malformed childId → 400 (validateObjectId), not a 500', async () => {
    const res = await request(app).get('/school-portal/parent/children/not-an-id/homework').set(auth(ctx.a.parentToken));
    expect(res.status).toBe(400);
  });

  it('cross-school notice / event ids → 404', async () => {
    expect((await request(app).get(`/school-portal/parent/notices/${ctx.b.noticeId}`).set(auth(ctx.a.parentToken))).status).toBe(404);
  });

  it('/me identity comes from the token, not any supplied id', async () => {
    const res = await request(app)
      .get(`/school-portal/parent/me?parentId=${ctx.b.parentId}`)
      .set(auth(ctx.a.parentToken));
    expect(res.body.data.parent.id).toBe(ctx.a.parentId);
  });
});
