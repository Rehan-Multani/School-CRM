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

describe('Student APK — IDOR / BOLA / cross-school / RBAC', () => {
  it('every /school-portal/student/* route needs a token (401)', async () => {
    for (const path of ['/dashboard', '/timetable', '/attendance/summary', '/results', '/fees/summary', '/notifications', '/profile']) {
      const res = await request(app).get(`/school-portal/student${path}`);
      expect(res.status, path).toBe(401);
    }
  });

  it('a bad/garbage token is rejected 401', async () => {
    const res = await request(app).get('/school-portal/student/dashboard').set({ Authorization: badToken });
    expect(res.status).toBe(401);
  });

  it('a TEACHER token cannot use student routes (403)', async () => {
    const res = await request(app).get('/school-portal/student/dashboard').set(auth(ctx.a.token));
    expect(res.status).toBe(403);
  });

  it('a SchoolAdmin token cannot use student routes (403)', async () => {
    const res = await request(app).get('/school-portal/student/profile').set(auth(ctx.a.adminToken));
    expect(res.status).toBe(403);
  });

  it('cross-school resource ids resolve to 404, never leak', async () => {
    const t = auth(ctx.a.studentToken);
    const cases = [
      `/school-portal/student/homework/${ctx.b.homeworkId}`,
      `/school-portal/student/exams/${ctx.b.examId}`,
      `/school-portal/student/results/${ctx.b.examId}`,
      `/school-portal/student/fees/invoices/${ctx.b.invoiceId}`,
      `/school-portal/student/notices/${ctx.b.noticeId}`,
    ];
    for (const path of cases) {
      const res = await request(app).get(path).set(t);
      expect(res.status, path).toBe(404);
    }
  });

  it('param-tampering another student\'s leave id yields 404', async () => {
    const created = await request(app)
      .post('/school-portal/student/leaves')
      .set(auth(ctx.b.studentToken))
      .send({ leaveType: 'CASUAL', startDate: '2026-11-01', endDate: '2026-11-01', reason: 'trip' });
    const otherLeaveId = created.body.data.id;
    const res = await request(app).get(`/school-portal/student/leaves/${otherLeaveId}`).set(auth(ctx.a.studentToken));
    expect(res.status).toBe(404);
  });

  it('document download-url rejects path traversal / non-owned paths', async () => {
    const trav = await request(app)
      .get('/school-portal/student/documents/download-url?path=../schoolb/secret.pdf')
      .set(auth(ctx.a.studentToken));
    expect([400, 403]).toContain(trav.status);

    const notOwned = await request(app)
      .get('/school-portal/student/documents/download-url?path=/uploads/students/other/id-card.webp')
      .set(auth(ctx.a.studentToken));
    expect([400, 403]).toContain(notOwned.status);
  });

  it('results list for student A never contains student B\'s rows', async () => {
    const res = await request(app).get('/school-portal/student/results').set(auth(ctx.a.studentToken));
    expect(res.body.data.every((r) => r.examId !== ctx.b.examId)).toBe(true);
  });

  it('my /me identity is derived from the token, not any supplied id', async () => {
    const res = await request(app)
      .get('/school-portal/student/me?studentId=' + ctx.b.studentId)
      .set(auth(ctx.a.studentToken));
    expect(res.body.data.student.id).toBe(ctx.a.studentId);
  });
});
