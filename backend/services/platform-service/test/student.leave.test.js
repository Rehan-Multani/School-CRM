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

describe('Student APK — leave (create / read / edit / cancel)', () => {
  let leaveId;

  it('creates a leave request (studentId derived from JWT)', async () => {
    const res = await request(app)
      .post('/school-portal/student/leaves')
      .set(auth(ctx.a.studentToken))
      .send({ leaveType: 'MEDICAL', startDate: '2026-10-01', endDate: '2026-10-03', reason: 'Fever' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.totalDays).toBe(3);
    leaveId = res.body.data.id;
  });

  it('rejects an inverted date range', async () => {
    const res = await request(app)
      .post('/school-portal/student/leaves')
      .set(auth(ctx.a.studentToken))
      .send({ leaveType: 'CASUAL', startDate: '2026-10-05', endDate: '2026-10-01', reason: 'x' });
    expect(res.status).toBe(400);
  });

  it('lists only my own leave requests', async () => {
    const mine = await request(app).get('/school-portal/student/leaves').set(auth(ctx.a.studentToken));
    expect(mine.body.data.some((l) => l.id === leaveId)).toBe(true);
    const other = await request(app).get('/school-portal/student/leaves').set(auth(ctx.b.studentToken));
    expect(other.body.data.every((l) => l.id !== leaveId)).toBe(true);
  });

  it('another student cannot fetch my leave by id (404)', async () => {
    const res = await request(app).get(`/school-portal/student/leaves/${leaveId}`).set(auth(ctx.b.studentToken));
    expect(res.status).toBe(404);
  });

  it('edits while PENDING then cancels', async () => {
    const patch = await request(app)
      .patch(`/school-portal/student/leaves/${leaveId}`)
      .set(auth(ctx.a.studentToken))
      .send({ reason: 'High fever, doctor advised rest' });
    expect(patch.status).toBe(200);
    expect(patch.body.data.reason).toContain('doctor');

    const cancel = await request(app).post(`/school-portal/student/leaves/${leaveId}/cancel`).set(auth(ctx.a.studentToken));
    expect(cancel.status).toBe(200);

    const cancelAgain = await request(app).post(`/school-portal/student/leaves/${leaveId}/cancel`).set(auth(ctx.a.studentToken));
    expect(cancelAgain.status).toBe(409);
    expect(cancelAgain.body.code).toBe('LEAVE_NOT_CANCELLABLE');
  });
});
