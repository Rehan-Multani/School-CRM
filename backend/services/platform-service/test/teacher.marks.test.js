import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let examId;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();

  const { Exam } = await import('../src/models/Exam.js');
  const { ExamSubject } = await import('../src/models/ExamSubject.js');
  const exam = await Exam.create({
    schoolId: ctx.a.schoolId, academicYearId: ctx.a.yearId, name: 'UT1', examType: 'UNIT_TEST',
    startDate: new Date(), endDate: new Date(), classIds: [ctx.a.classId], status: 'IN_PROGRESS',
  });
  examId = exam._id.toString();
  await ExamSubject.create({
    schoolId: ctx.a.schoolId, examId: exam._id, classId: ctx.a.classId, subjectId: ctx.a.subjectId,
    subjectName: 'English', maxMarks: 100, passingMarks: 33,
  });
}, 60000);
afterAll(disconnect);

describe('Teacher exam marks', () => {
  const body = (marks) => ({
    classId: ctx.a.classId, sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId,
    marksList: [{ studentId: ctx.a.studentId, marksObtained: marks, attendanceStatus: 'PRESENT' }],
  });

  it('saves valid marks and stamps gradedBy', async () => {
    const res = await request(app).post(`/school-portal/teacher/exams/${examId}/marks`).set(auth(ctx.a.token)).send(body(72));
    expect(res.status).toBe(200);
    const { ExamMarks } = await import('../src/models/ExamMarks.js');
    const row = await ExamMarks.findOne({ examId, studentId: ctx.a.studentId });
    expect(row.marksObtained).toBe(72);
    expect(String(row.gradedBy)).toBe(ctx.a.teacherId);
  });

  it('rejects out-of-range marks', async () => {
    const res = await request(app).post(`/school-portal/teacher/exams/${examId}/marks`).set(auth(ctx.a.token)).send(body(150));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_MARKS');
  });

  it('rejects marks for a subject the teacher does not teach', async () => {
    const { Subject } = await import('../src/models/Subject.js');
    const other = await Subject.create({ schoolId: ctx.a.schoolId, name: 'Bio', code: 'BIO' });
    const res = await request(app)
      .post(`/school-portal/teacher/exams/${examId}/marks`)
      .set(auth(ctx.a.token))
      .send({ ...body(50), subjectId: other._id.toString() });
    expect(res.status).toBe(403);
  });

  it('blocks writes to a published (finalized) exam', async () => {
    const { Exam } = await import('../src/models/Exam.js');
    await Exam.updateOne({ _id: examId }, { $set: { status: 'PUBLISHED' } });
    const res = await request(app).post(`/school-portal/teacher/exams/${examId}/marks`).set(auth(ctx.a.token)).send(body(40));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EXAM_FINALIZED');
    await Exam.updateOne({ _id: examId }, { $set: { status: 'IN_PROGRESS' } });
  });

  it('is idempotent under an Idempotency-Key', async () => {
    const key = 'marks-key-1';
    await request(app).post(`/school-portal/teacher/exams/${examId}/marks`).set(auth(ctx.a.token)).set('Idempotency-Key', key).send(body(60));
    const retry = await request(app)
      .post(`/school-portal/teacher/exams/${examId}/marks`)
      .set(auth(ctx.a.token))
      .set('Idempotency-Key', key)
      .send(body(10));
    expect(retry.headers['idempotency-replayed']).toBe('true');
    const { ExamMarks } = await import('../src/models/ExamMarks.js');
    const row = await ExamMarks.findOne({ examId, studentId: ctx.a.studentId });
    expect(row.marksObtained).toBe(60);
  });
});
