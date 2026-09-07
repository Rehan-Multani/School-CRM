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

describe('Cross-school isolation (teacher A vs school B resources)', () => {
  it('cannot read school B section roster', async () => {
    const res = await request(app)
      .get(`/school-portal/teacher/sections/${ctx.b.sectionId}/students`)
      .set(auth(ctx.a.token));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SECTION_ACCESS_DENIED');
  });

  it('cannot read school B class', async () => {
    const res = await request(app).get(`/school-portal/teacher/classes/${ctx.b.classId}`).set(auth(ctx.a.token));
    expect(res.status).toBe(403);
  });

  it('cannot read school B student', async () => {
    const res = await request(app).get(`/school-portal/teacher/students/${ctx.b.studentId}`).set(auth(ctx.a.token));
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('STUDENT_ACCESS_DENIED');
  });

  it('cannot submit attendance for a school B section', async () => {
    const res = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.b.sectionId, date: today(), records: [{ studentId: ctx.b.studentId, status: 'PRESENT' }] });
    expect(res.status).toBe(403);
  });

  it('only sees its own classes', async () => {
    const res = await request(app).get('/school-portal/teacher/classes').set(auth(ctx.a.token));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((c) => c.id);
    expect(ids).toContain(ctx.a.classId);
    expect(ids).not.toContain(ctx.b.classId);
  });
});

function today() {
  return new Date().toISOString().slice(0, 10);
}
