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

describe('Student APK — academics (timetable / homework / materials / classwork)', () => {
  it('GET /timetable returns a week keyed by day for the student section', async () => {
    const res = await request(app).get('/school-portal/student/timetable').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    expect(res.body.data.days).toContain('MON');
    expect(res.body.data.timetable).toHaveProperty('MON');
  });

  it('GET /timetable/day/:day validates the day param', async () => {
    const bad = await request(app).get('/school-portal/student/timetable/day/FUNDAY').set(auth(ctx.a.studentToken));
    expect(bad.status).toBe(400);
    const ok = await request(app).get('/school-portal/student/timetable/day/mon').set(auth(ctx.a.studentToken));
    expect(ok.status).toBe(200);
    expect(ok.body.data.day).toBe('MON');
  });

  it('GET /homework lists the section homework merged with my submission status', async () => {
    const res = await request(app).get('/school-portal/student/homework').set(auth(ctx.a.studentToken));
    expect(res.status).toBe(200);
    const mine = res.body.data.find((h) => h.id === ctx.a.homeworkId);
    expect(mine).toBeTruthy();
    expect(mine.submissionStatus).toBe('PENDING');
  });

  it('status filters partition the list (pending vs completed)', async () => {
    const pending = await request(app).get('/school-portal/student/homework?status=pending').set(auth(ctx.a.studentToken));
    expect(pending.body.data.some((h) => h.id === ctx.a.homeworkId)).toBe(true);
    const completed = await request(app).get('/school-portal/student/homework?status=completed').set(auth(ctx.a.studentToken));
    expect(completed.body.data.some((h) => h.id === ctx.a.homeworkId)).toBe(false);
  });

  it('POST /homework/:id/submission records a submission and flips the status', async () => {
    const res = await request(app)
      .post(`/school-portal/student/homework/${ctx.a.homeworkId}/submission`)
      .set(auth(ctx.a.studentToken))
      .field('remarks', 'Done, attached my work.');
    expect(res.status).toBe(200);
    expect(['SUBMITTED', 'LATE']).toContain(res.body.data.submissionStatus);

    const after = await request(app).get(`/school-portal/student/homework/${ctx.a.homeworkId}`).set(auth(ctx.a.studentToken));
    expect(['SUBMITTED', 'LATE']).toContain(after.body.data.submissionStatus);

    const completed = await request(app).get('/school-portal/student/homework?status=completed').set(auth(ctx.a.studentToken));
    expect(completed.body.data.some((h) => h.id === ctx.a.homeworkId)).toBe(true);
  });

  it('a School-B homework id is not visible to a School-A student (404)', async () => {
    const res = await request(app)
      .get(`/school-portal/student/homework/${ctx.b.homeworkId}`)
      .set(auth(ctx.a.studentToken));
    expect(res.status).toBe(404);
  });

  it('GET /materials and /classwork are shaped and scoped', async () => {
    const mats = await request(app).get('/school-portal/student/materials').set(auth(ctx.a.studentToken));
    expect(mats.status).toBe(200);
    expect(Array.isArray(mats.body.data)).toBe(true);
    const cw = await request(app).get('/school-portal/student/classwork').set(auth(ctx.a.studentToken));
    expect(cw.status).toBe(200);
    expect(Array.isArray(cw.body.data)).toBe(true);
  });
});
