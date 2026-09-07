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

describe('Parent APK — academics for the linked child', () => {
  it('homework list is the child section homework', async () => {
    const res = await request(app).get(`${kidA()}/homework`).set(auth(ctx.a.parentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.some((h) => h.id === ctx.a.homeworkId)).toBe(true);
  });

  it('timetable + materials + classwork are shaped', async () => {
    expect((await request(app).get(`${kidA()}/timetable`).set(auth(ctx.a.parentToken))).body.data.days).toContain('MON');
    expect(Array.isArray((await request(app).get(`${kidA()}/materials`).set(auth(ctx.a.parentToken))).body.data)).toBe(true);
    expect(Array.isArray((await request(app).get(`${kidA()}/classwork`).set(auth(ctx.a.parentToken))).body.data)).toBe(true);
  });

  it('exams list is scoped to the child class; results only for PUBLISHED exams', async () => {
    const exams = await request(app).get(`${kidA()}/exams`).set(auth(ctx.a.parentToken));
    expect(exams.body.data.some((e) => e.id === ctx.a.examId)).toBe(true);

    const results = await request(app).get(`${kidA()}/results`).set(auth(ctx.a.parentToken));
    expect(results.body.data.length).toBe(1);
    expect(results.body.data[0].examId).toBe(ctx.a.examId);

    const detail = await request(app).get(`${kidA()}/results/${ctx.a.examId}`).set(auth(ctx.a.parentToken));
    expect(detail.body.data.percentage).toBe(82);

    const draft = await request(app).get(`${kidA()}/results/${ctx.a.examDraftId}`).set(auth(ctx.a.parentToken));
    expect(draft.status).toBe(403);
    expect(draft.body.code).toBe('RESULT_NOT_PUBLISHED');
  });

  it('report-card aggregates published results', async () => {
    const res = await request(app).get(`${kidA()}/report-card`).set(auth(ctx.a.parentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.examCount).toBe(1);
    expect(res.body.data.aggregatePercentage).toBe(82);
  });

  it('cannot read another school child homework id (404) or another child entirely (403)', async () => {
    // valid-looking id from School B, but the child is School A's → homework not found in that section
    expect((await request(app).get(`${kidA()}/homework/${ctx.b.homeworkId}`).set(auth(ctx.a.parentToken))).status).toBe(404);
    // parent A pointing at School B's student → link check fails
    expect((await request(app).get(`/school-portal/parent/children/${ctx.b.studentId}/homework`).set(auth(ctx.a.parentToken))).status).toBe(403);
  });
});
