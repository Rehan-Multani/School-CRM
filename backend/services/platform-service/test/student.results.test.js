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

describe('Student APK — exams & results', () => {
  it('GET /exams lists exams for my class only', async () => {
    const res = await request(app).get('/school-portal/student/exams').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.some((e) => e.id === ctx.a.examId)).toBe(true);
    expect(res.body.data.every((e) => e.id !== ctx.b.examId)).toBe(true);
  });

  it('GET /results returns only PUBLISHED-exam results for me', async () => {
    const res = await request(app).get('/school-portal/student/results').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].examId).toBe(ctx.a.examId);
  });

  it('GET /results/:examId returns my subject breakdown', async () => {
    const res = await request(app).get(`/school-portal/student/results/${ctx.a.examId}`).set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.percentage).toBe(82);
    expect(res.body.data.subjects.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.rank).toBe(3);
  });

  it('a result whose exam is NOT published is hidden (403 RESULT_NOT_PUBLISHED)', async () => {
    const res = await request(app).get(`/school-portal/student/results/${ctx.a.examDraftId}`).set(auth(ctx.a.studentToken));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESULT_NOT_PUBLISHED');
  });

  it('cannot read another school\'s exam / result (404)', async () => {
    expect((await request(app).get(`/school-portal/student/exams/${ctx.b.examId}`).set(auth(ctx.a.studentToken))).status).toBe(404);
    expect((await request(app).get(`/school-portal/student/results/${ctx.b.examId}`).set(auth(ctx.a.studentToken))).status).toBe(404);
  });

  it('GET /report-card aggregates published results', async () => {
    const res = await request(app).get('/school-portal/student/report-card').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.examCount).toBe(1);
    expect(res.body.data.aggregatePercentage).toBe(82);
  });
});
