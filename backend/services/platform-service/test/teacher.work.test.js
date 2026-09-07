import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const inWeek = () => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Homework & assignments — ownership', () => {
  let hwId;
  let asId;

  it('creates homework for an assigned section/subject', async () => {
    const res = await request(app)
      .post('/school-portal/teacher/homework')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, title: 'HW1', dueDate: inWeek() });
    expect(res.status).toBe(201);
    hwId = res.body.data.id;
    expect(res.body.data.className).toBe('Class 10');
  });

  it('refuses homework for a subject the teacher does not teach', async () => {
    const { Subject } = await import('../src/models/Subject.js');
    const other = await Subject.create({ schoolId: ctx.a.schoolId, name: 'Physics', code: 'PHY' });
    const res = await request(app)
      .post('/school-portal/teacher/homework')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.a.sectionId, subjectId: other._id.toString(), title: 'x', dueDate: inWeek() });
    expect(res.status).toBe(403);
  });

  it('another teacher (school B) cannot patch or delete it (404/403, never 200)', async () => {
    const patch = await request(app)
      .patch(`/school-portal/teacher/homework/${hwId}`)
      .set(auth(ctx.b.token))
      .send({ title: 'hacked' });
    expect([403, 404]).toContain(patch.status);

    const del = await request(app).delete(`/school-portal/teacher/homework/${hwId}`).set(auth(ctx.b.token));
    expect([403, 404]).toContain(del.status);
  });

  it('creates an assignment and grades a submission within maxMarks', async () => {
    const create = await request(app)
      .post('/school-portal/teacher/assignments')
      .set(auth(ctx.a.token))
      .send({ sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId, title: 'Essay', maxMarks: 20, dueDate: inWeek() });
    expect(create.status).toBe(201);
    asId = create.body.data.id;

    const { AssignmentSubmission } = await import('../src/models/AssignmentSubmission.js');
    const sub = await AssignmentSubmission.create({
      schoolId: ctx.a.schoolId, assignmentId: asId, studentId: ctx.a.studentId, studentName: 'Sam', status: 'SUBMITTED', submittedAt: new Date(),
    });

    const good = await request(app)
      .patch(`/school-portal/teacher/assignments/${asId}/submissions/${sub._id}/grade`)
      .set(auth(ctx.a.token))
      .send({ marksObtained: 18, feedback: 'nice' });
    expect(good.status).toBe(200);
    expect(good.body.data.status).toBe('GRADED');

    const over = await request(app)
      .patch(`/school-portal/teacher/assignments/${asId}/submissions/${sub._id}/grade`)
      .set(auth(ctx.a.token))
      .send({ marksObtained: 21 });
    expect(over.status).toBe(400);
    expect(over.body.code).toBe('INVALID_MARKS');
  });
});
