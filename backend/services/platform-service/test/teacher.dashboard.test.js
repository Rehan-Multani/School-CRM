/**
 * Teacher Home "pending marks" tile: counts only (exam × section × subject)
 * slots the marks screen would actually accept — exams still open for marks
 * (not COMPLETED/PUBLISHED) that have already started — and drops as marks
 * are saved. Runs against the in-memory seed.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let models;
const dash = async () =>
  (await request(app).get('/school-portal/teacher/dashboard').set('Authorization', `Bearer ${ctx.token}`)).body.data.stats;

beforeAll(async () => {
  await connect();
  ({ a: ctx } = await seed());
  app = await getApp();
  models = {
    Exam: (await import('../src/models/Exam.js')).Exam,
    ExamSubject: (await import('../src/models/ExamSubject.js')).ExamSubject,
  };
});

afterAll(async () => {
  await disconnect();
});

async function examWithSubject(status, startInDays) {
  const exam = await models.Exam.create({
    schoolId: ctx.schoolId, academicYearId: ctx.yearId, name: `Exam ${status} ${startInDays}`, examType: 'UNIT_TEST',
    startDate: new Date(Date.now() + startInDays * 86400000), endDate: new Date(Date.now() + (startInDays + 2) * 86400000),
    classIds: [ctx.classId], status,
  });
  await models.ExamSubject.create({
    schoolId: ctx.schoolId, examId: exam._id, classId: ctx.classId, subjectId: ctx.subjectId, subjectName: 'English', maxMarks: 50, passingMarks: 17,
  });
  return exam;
}

describe('Teacher dashboard — pending marks', () => {
  it('ignores published/completed exams and exams that have not started', async () => {
    await examWithSubject('COMPLETED', -10);
    await examWithSubject('PUBLISHED', -20);
    await examWithSubject('SCHEDULED', 5);
    expect((await dash()).pendingMarks).toBe(0);
  });

  it('counts an open exam that has started, and clears once marks are saved', async () => {
    const exam = await examWithSubject('IN_PROGRESS', -3);
    expect((await dash()).pendingMarks).toBe(1);

    const res = await request(app)
      .post(`/school-portal/teacher/exams/${exam._id}/marks`)
      .set({ Authorization: `Bearer ${ctx.token}`, 'Idempotency-Key': 'dash-pending-1' })
      .send({
        classId: ctx.classId, sectionId: ctx.sectionId, subjectId: ctx.subjectId,
        marksList: [{ studentId: ctx.studentId, attendanceStatus: 'PRESENT', marksObtained: 40 }],
      });
    expect(res.status).toBeLessThan(300);
    expect((await dash()).pendingMarks).toBe(0);
  });
});
