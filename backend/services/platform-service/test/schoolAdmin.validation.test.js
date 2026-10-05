import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

// Rules the School Admin panel relies on the API to enforce. Each of these was
// once accepted (or answered "Internal server error") and is pinned here.
let app;
let ctx;

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const api = (method, path, body) => {
  const req = request(app)[method](path).set(auth(ctx.a.adminToken));
  return body === undefined ? req : req.send(body);
};

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 120000);

afterAll(disconnect);

describe('Academics', () => {
  it('a class can be created without naming a year: it joins the current one', async () => {
    const { AcademicYear } = await import('../src/models/AcademicYear.js');
    await AcademicYear.updateOne({ _id: ctx.a.yearId }, { $set: { isCurrent: true } });
    const res = await api('post', '/school-portal/academic/classes', { name: 'Validation Class', code: 'VALC', numericOrder: 50 });
    expect(res.status).toBe(201);
    expect(res.body.data.academicYearId).toBe(ctx.a.yearId);
  });

  it('a subject cannot pass at more than its maximum marks', async () => {
    const res = await api('post', '/school-portal/academic/subjects', { name: 'Validation Subject', code: 'VALS', maxMarks: 50, passingMarks: 80 });
    expect(res.status).toBe(400);
  });

  it('a section needs a year and a class (400, not 404)', async () => {
    expect((await api('post', '/school-portal/academic/sections', {})).status).toBe(400);
  });
});

describe('Students and teachers', () => {
  const student = (over = {}) => ({
    admissionNumber: `VAL-${Math.random().toString(36).slice(2, 8)}`,
    firstName: 'Val',
    lastName: 'Student',
    gender: 'MALE',
    dateOfBirth: '2012-05-10',
    parentName: 'Val Parent',
    parentPhone: '9811100011',
    academicYearId: ctx.a.yearId,
    classId: ctx.a.classId,
    sectionId: ctx.a.sectionId,
    ...over,
  });

  it('refuses a date of birth in the future', async () => {
    const res = await api('post', '/school-portal/students', student({ dateOfBirth: '2099-01-01' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Date of birth cannot be in the future');
  });

  it('refuses a parent phone that is not a 10-digit mobile', async () => {
    const res = await api('post', '/school-portal/students', student({ parentPhone: '123' }));
    expect(res.status).toBe(400);
  });

  it('still admits a valid student', async () => {
    expect((await api('post', '/school-portal/students', student())).status).toBe(201);
  });

  it('two teachers of a school cannot share an email', async () => {
    const teacher = (over = {}) => ({
      name: 'Val Teacher',
      gender: 'MALE',
      email: 'val.teacher@schoola.edu',
      mobileNumber: '9811100022',
      employeeId: `VALT-${Math.random().toString(36).slice(2, 7)}`,
      joiningDate: '2024-04-01',
      qualifications: [{ degree: 'B.Ed' }],
      ...over,
    });
    expect((await api('post', '/school-portal/academic/teachers', teacher())).status).toBe(201);
    expect((await api('post', '/school-portal/academic/teachers', teacher())).status).toBe(409);
    expect((await api('post', '/school-portal/academic/teachers', teacher({ email: 'val.other@schoola.edu', mobileNumber: '12' }))).status).toBe(400);
  });
});

describe('Exams', () => {
  let examId;
  const exam = (over = {}) => ({
    name: `Validation Exam ${Math.random().toString(36).slice(2, 7)}`,
    academicYearId: ctx.a.yearId,
    startDate: '2026-11-01',
    endDate: '2026-11-05',
    examType: 'UNIT_TEST',
    classIds: [ctx.a.classId],
    ...over,
  });
  const scope = () => ({ classId: ctx.a.classId, sectionId: ctx.a.sectionId, subjectId: ctx.a.subjectId });

  it('bad input is a 400 with a reason, never a 500', async () => {
    const empty = await api('post', '/school-portal/exams', {});
    expect(empty.status).toBe(400);
    expect(empty.body.message).toBe('Exam name is required');
    expect((await api('post', '/school-portal/exams', { name: 12345 })).status).toBe(400);
    expect((await api('post', '/school-portal/exams', exam({ startDate: '2026-11-10', endDate: '2026-11-01' }))).status).toBe(400);
  });

  it('creates an exam and keeps its subject marks consistent', async () => {
    const created = await api('post', '/school-portal/exams', exam());
    expect(created.status).toBe(201);
    examId = created.body.data.id;

    const subjects = await api('get', `/school-portal/exams/${examId}/subjects`);
    let subject = subjects.body.data.find((s) => s.subjectId === ctx.a.subjectId);
    if (!subject) {
      const added = await api('post', `/school-portal/exams/${examId}/subjects`, { ...scope(), subjectName: 'Subject', maxMarks: 50, passingMarks: 17 });
      expect(added.status).toBe(201);
      subject = added.body.data;
    }
    expect((await api('patch', `/school-portal/exams/${examId}/subjects/${subject.id}`, { maxMarks: 50, passingMarks: 80 })).status).toBe(400);
    expect((await api('patch', `/school-portal/exams/${examId}/subjects/${subject.id}`, { maxMarks: 50, passingMarks: 17 })).status).toBe(200);
  });

  it('a paper must sit inside the exam dates and end after it starts', async () => {
    const slot = (over) => ({ ...scope(), examDate: '2026-11-02', startTime: '09:00', endTime: '11:00', ...over });
    expect((await api('post', `/school-portal/exams/${examId}/schedule`, slot({ examDate: '2027-01-01' }))).status).toBe(400);
    expect((await api('post', `/school-portal/exams/${examId}/schedule`, slot({ startTime: '11:00', endTime: '09:00' }))).status).toBe(400);
    expect((await api('post', `/school-portal/exams/${examId}/schedule`, slot())).status).toBe(201);
  });

  it('marks are limited by the exam subject, not by what the request claims', async () => {
    const save = (marksList) => api('post', `/school-portal/exams/${examId}/marks`, { ...scope(), marksList });
    expect((await save([{ studentId: ctx.a.studentId, marksObtained: 999, maxMarks: 1000 }])).status).toBe(400);
    expect((await save([{ studentId: ctx.a.studentId, marksObtained: -5 }])).status).toBe(400);
    expect((await save([{ studentId: ctx.b.studentId, marksObtained: 5 }])).status).toBe(400); // another school's student
    expect((await save([{ studentId: ctx.a.studentId, marksObtained: 41, maxMarks: 1000 }])).status).toBe(200);

    const sheet = await api('get', `/school-portal/exams/${examId}/marks`).query(scope());
    const row = sheet.body.data.students.find((s) => s.studentId === ctx.a.studentId);
    expect(row.marksObtained).toBe(41);
    expect(row.maxMarks).toBe(50);
  });

  it('a request cannot move an exam to another school', async () => {
    const res = await api('patch', `/school-portal/exams/${examId}`, { description: 'edited', schoolId: ctx.b.schoolId });
    expect(res.status).toBe(200);
    expect((await api('get', `/school-portal/exams/${examId}`)).status).toBe(200);
  });
});

describe('Attendance, leave and admissions', () => {
  it('an unknown attendance status is refused instead of being saved as present', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await api('post', '/school-portal/attendance/students', {
      sectionId: ctx.a.sectionId,
      date: today,
      entries: [{ studentId: ctx.a.studentId, status: 'DANCING' }],
    });
    expect(res.status).toBe(400);
  });

  it('a leave request is decided only once', async () => {
    const created = await api('post', '/school-portal/hr/leave', {
      employeeRefId: ctx.a.teacherId,
      employeeType: 'TEACHER',
      employeeId: 'VAL-EMP-1',
      employeeName: 'Val Teacher',
      leaveType: 'CASUAL',
      startDate: '2026-12-01',
      endDate: '2026-12-02',
      reason: 'validation',
    });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    if (created.body.data.status === 'PENDING') {
      expect((await api('patch', `/school-portal/hr/leave/${id}/approve`, {})).status).toBe(200);
    }
    expect((await api('patch', `/school-portal/hr/leave/${id}/approve`, {})).status).toBe(409);
    expect((await api('patch', `/school-portal/hr/leave/${id}/reject`, {})).status).toBe(409);
    expect((await api('patch', `/school-portal/hr/leave/${id}/cancel`, {})).status).toBe(200);
    expect((await api('patch', `/school-portal/hr/leave/${id}/cancel`, {})).status).toBe(409);
  });

  it('an admission needs a real guardian phone', async () => {
    const res = await api('post', '/school-portal/admissions', { applicantName: 'Val Applicant', guardianName: 'Val Guardian', phone: '12' });
    expect(res.status).toBe(400);
  });

  it('wrong-typed fields are a 400, not a crash', async () => {
    for (const path of ['/school-portal/events', '/school-portal/homework', '/school-portal/hr/departments', '/school-portal/hr/employees']) {
      const res = await api('post', path, { name: 12345, title: { a: 1 }, email: 99 });
      expect(res.status, path).toBe(400);
    }
  });
});
