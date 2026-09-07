import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const today = () => new Date().toISOString().slice(0, 10);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Teacher attendance', () => {
  it('submits attendance for an assigned section', async () => {
    const res = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.a.sectionId, date: today(), records: [{ studentId: ctx.a.studentId, status: 'PRESENT' }] });
    expect(res.status).toBe(200);
    expect(res.body.data.entries[0].status).toBe('PRESENT');
    expect(res.body.data.markedById).toBe(ctx.a.teacherId);
  });

  it('is idempotent under one Idempotency-Key (retry does not overwrite)', async () => {
    const key = 'test-key-1';
    const first = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.a.token))
      .set('Idempotency-Key', key)
      .send({ sectionId: ctx.a.sectionId, date: today(), records: [{ studentId: ctx.a.studentId, status: 'LATE' }] });
    expect(first.status).toBe(200);

    const retry = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.a.token))
      .set('Idempotency-Key', key)
      .send({ sectionId: ctx.a.sectionId, date: today(), records: [{ studentId: ctx.a.studentId, status: 'ABSENT' }] });
    expect(retry.status).toBe(200);
    expect(retry.headers['idempotency-replayed']).toBe('true');
    const samEntry = retry.body.data.entries.find((e) => e.studentId === ctx.a.studentId);
    expect(samEntry.status).toBe('LATE'); // replayed, not re-run

    const { StudentAttendance } = await import('../src/models/StudentAttendance.js');
    const count = await StudentAttendance.countDocuments({ sectionId: ctx.a.sectionId, date: today() });
    expect(count).toBe(1);
  });

  it('rejects an unknown status', async () => {
    const res = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.a.sectionId, date: today(), records: [{ studentId: ctx.a.studentId, status: 'NAPPING' }] });
    expect(res.status).toBe(400);
  });

  it('rejects a student outside the section', async () => {
    const res = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.a.sectionId, date: today(), records: [{ studentId: ctx.b.studentId, status: 'PRESENT' }] });
    expect(res.status).toBe(403);
  });

  it('rejects a future date', async () => {
    const res = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.a.sectionId, date: '2099-01-01', records: [{ studentId: ctx.a.studentId, status: 'PRESENT' }] });
    expect(res.status).toBe(400);
  });

  it('blocks edits once finalized', async () => {
    const sub = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.a.sectionId, date: today(), records: [{ studentId: ctx.a.studentId, status: 'PRESENT' }] });
    await request(app).post(`/school-portal/teacher/attendance/${sub.body.data.id}/finalize`).set(auth(ctx.a.token));
    const res = await request(app)
      .post('/school-portal/teacher/attendance')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.a.sectionId, date: today(), records: [{ studentId: ctx.a.studentId, status: 'ABSENT' }] });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ATTENDANCE_FINALIZED');
  });
});
