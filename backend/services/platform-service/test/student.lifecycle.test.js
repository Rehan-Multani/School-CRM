import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
let nextYear;
let nextClass;
let nextSection;
let models;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
  models = {
    AcademicYear: (await import('../src/models/AcademicYear.js')).AcademicYear,
    SchoolClass: (await import('../src/models/SchoolClass.js')).SchoolClass,
    Section: (await import('../src/models/Section.js')).Section,
    Student: (await import('../src/models/Student.js')).Student,
    StudentEnrollment: (await import('../src/models/StudentEnrollment.js')).StudentEnrollment,
  };
  nextYear = await models.AcademicYear.create({
    schoolId: ctx.a.schoolId, name: '2027-28', code: 'AY2728',
    startDate: new Date('2027-04-01'), endDate: new Date('2028-03-31'), status: 'DRAFT',
  });
  nextClass = await models.SchoolClass.create({
    schoolId: ctx.a.schoolId, academicYearId: nextYear._id, name: 'Class 11', code: 'C11', numericOrder: 11,
  });
  nextSection = await models.Section.create({
    schoolId: ctx.a.schoolId, academicYearId: nextYear._id, classId: nextClass._id, name: 'A', capacity: 40,
  });
}, 120000);

afterAll(disconnect);

describe('Student lifecycle: promotion', () => {
  it('preview lists the active students of the source class/section', async () => {
    const res = await request(app)
      .get('/school-portal/students/promote/preview')
      .query({ fromAcademicYearId: ctx.a.yearId, fromClassId: ctx.a.classId, fromSectionId: ctx.a.sectionId })
      .set(auth(ctx.a.adminToken));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((s) => s.id);
    expect(ids).toContain(ctx.a.studentId);
    expect(ids).toContain(ctx.a.studentNoGuardianId);
    expect(res.body.data[0]).toHaveProperty('admissionNumber');
  });

  it('promotes the selected students into the next year and closes the old enrollment', async () => {
    const res = await request(app)
      .post('/school-portal/students/promote')
      .set(auth(ctx.a.adminToken))
      .send({
        fromAcademicYearId: ctx.a.yearId, toAcademicYearId: nextYear._id.toString(),
        fromClassId: ctx.a.classId, fromSectionId: ctx.a.sectionId,
        toClassId: nextClass._id.toString(), toSectionId: nextSection._id.toString(),
        studentIds: [ctx.a.studentNoGuardianId],
        rollNumbers: { [ctx.a.studentNoGuardianId]: '7' },
      });
    expect(res.status).toBe(200);
    expect(res.body.data.promoted).toBe(1);
    expect(res.body.data.skipped).toEqual([]);

    const old = await models.StudentEnrollment.findOne({ studentId: ctx.a.studentNoGuardianId, academicYearId: ctx.a.yearId });
    expect(old.status).toBe('PROMOTED');
    expect(old.leavingDate).toBeTruthy();
    const fresh = await models.StudentEnrollment.findOne({ studentId: ctx.a.studentNoGuardianId, academicYearId: nextYear._id });
    expect(fresh.status).toBe('ACTIVE');
    expect(fresh.rollNumber).toBe('7');
    expect(fresh.classId.toString()).toBe(nextClass._id.toString());
    expect(fresh.enrollmentDate.toISOString()).toBe(nextYear.startDate.toISOString());
  });

  it('409s when a student already has an active enrollment in the target year', async () => {
    const res = await request(app)
      .post('/school-portal/students/promote')
      .set(auth(ctx.a.adminToken))
      .send({
        fromAcademicYearId: ctx.a.yearId, toAcademicYearId: nextYear._id.toString(),
        fromClassId: ctx.a.classId, toClassId: nextClass._id.toString(), toSectionId: nextSection._id.toString(),
        studentIds: [ctx.a.studentNoGuardianId],
      });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_ENROLLED');
    expect(res.body.studentIds).toContain(ctx.a.studentNoGuardianId);
  });

  it('rejects promotion within the same year', async () => {
    const res = await request(app)
      .post('/school-portal/students/promote')
      .set(auth(ctx.a.adminToken))
      .send({
        fromAcademicYearId: ctx.a.yearId, toAcademicYearId: ctx.a.yearId,
        fromClassId: ctx.a.classId, toClassId: ctx.a.classId, toSectionId: ctx.a.sectionId,
        studentIds: [ctx.a.studentId],
      });
    expect(res.status).toBe(400);
  });

  it('does not let School B see School A students in the preview', async () => {
    const res = await request(app)
      .get('/school-portal/students/promote/preview')
      .query({ fromAcademicYearId: ctx.a.yearId, fromClassId: ctx.a.classId })
      .set(auth(ctx.b.adminToken));
    expect(res.status).toBe(404);
  });
});

describe('Student lifecycle: transfer / TC', () => {
  it('is blocked by a pending fee invoice', async () => {
    const res = await request(app)
      .post(`/school-portal/students/${ctx.a.studentId}/transfer`)
      .set(auth(ctx.a.adminToken))
      .send({ type: 'TRANSFERRED', reason: 'Family relocated' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('FEES_PENDING');
    expect(res.body.message).toMatch(/Clear pending fees/);
    expect(res.body.pendingAmount).toBe(8000);
  });

  it('goes through with force=true and records the leaving details', async () => {
    const res = await request(app)
      .post(`/school-portal/students/${ctx.a.studentId}/transfer`)
      .set(auth(ctx.a.adminToken))
      .send({ type: 'TRANSFERRED', reason: 'Family relocated', tcNumber: 'TC-001', leavingDate: '2026-10-01', force: true });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');
    expect(res.body.data.leaving.type).toBe('TRANSFERRED');
    expect(res.body.data.leaving.tcNumber).toBe('TC-001');
    expect(res.body.data.enrollment.status).toBe('TRANSFERRED');
    expect(res.body.data.enrollment.leavingDate).toBeTruthy();
  });

  it('serves the transfer certificate data', async () => {
    const res = await request(app)
      .get(`/school-portal/students/${ctx.a.studentId}/transfer-certificate`)
      .set(auth(ctx.a.adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.school.name).toBe('School A');
    expect(res.body.data.student.id).toBe(ctx.a.studentId);
    expect(res.body.data.className).toBe('Class 10');
    expect(res.body.data.sectionName).toBe('A');
    expect(res.body.data.leaving.tcNumber).toBe('TC-001');
    expect(res.body.data.leaving.reason).toBe('Family relocated');
  });

  it('reactivate undoes the transfer', async () => {
    const res = await request(app)
      .post(`/school-portal/students/${ctx.a.studentId}/reactivate`)
      .set(auth(ctx.a.adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.leaving).toBeNull();
    expect(res.body.data.enrollment.status).toBe('ACTIVE');
    expect(res.body.data.enrollment.leavingDate).toBeNull();
  });

  it('other school cannot transfer the student', async () => {
    const res = await request(app)
      .post(`/school-portal/students/${ctx.a.studentId}/transfer`)
      .set(auth(ctx.b.adminToken))
      .send({ type: 'WITHDRAWN', reason: 'x', force: true });
    expect(res.status).toBe(404);
  });
});

describe('Student lifecycle: CSV import', () => {
  const csv = [
    'admissionNumber,firstName,lastName,gender,dateOfBirth,className,sectionName,rollNumber,parentName,parentPhone,email,phone,address',
    'IMP-001,Riya,Shah,FEMALE,2012-05-20,Class 10,A,21,Nita Shah,9876501234,riya@example.com,,"Pune, MH"',
    'IMP-002,Bad,Row,MALE,2012-01-01,Class 99,A,22,Someone,9876501235,,,',
  ].join('\n');

  it('serves the template', async () => {
    const res = await request(app).get('/school-portal/students/import/template').set(auth(ctx.a.adminToken));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.split(/\r?\n/)[0]).toBe(
      'admissionNumber,firstName,lastName,gender,dateOfBirth,className,sectionName,rollNumber,parentName,parentPhone,email,phone,address'
    );
  });

  it('dry run validates without creating anything', async () => {
    const res = await request(app)
      .post('/school-portal/students/import?dryRun=1')
      .set(auth(ctx.a.adminToken))
      .field('academicYearId', ctx.a.yearId)
      .attach('file', Buffer.from(csv), 'students.csv');
    expect(res.status).toBe(200);
    expect(res.body.data.dryRun).toBe(true);
    expect(res.body.data.valid).toBe(1);
    expect(res.body.data.imported).toBe(0);
    expect(res.body.data.failed).toHaveLength(1);
    expect(res.body.data.failed[0]).toMatchObject({ row: 3, admissionNumber: 'IMP-002' });
    expect(res.body.data.failed[0].error).toMatch(/class "Class 99" not found/);
    expect(await models.Student.countDocuments({ schoolId: ctx.a.schoolId, admissionNumber: 'IMP-001' })).toBe(0);
  });

  it('real import creates the good row and reports the bad one', async () => {
    const res = await request(app)
      .post('/school-portal/students/import')
      .set(auth(ctx.a.adminToken))
      .field('academicYearId', ctx.a.yearId)
      .attach('file', Buffer.from(csv), 'students.csv');
    expect(res.status).toBe(200);
    expect(res.body.data.imported).toBe(1);
    expect(res.body.data.failed).toHaveLength(1);
    const student = await models.Student.findOne({ schoolId: ctx.a.schoolId, admissionNumber: 'IMP-001' });
    expect(student).toBeTruthy();
    expect(student.address).toBe('Pune, MH');
    const enrollment = await models.StudentEnrollment.findOne({ studentId: student._id });
    expect(enrollment.sectionId.toString()).toBe(ctx.a.sectionId);
    expect(enrollment.rollNumber).toBe('21');
  });

  it('rejects a non-csv file', async () => {
    const res = await request(app)
      .post('/school-portal/students/import')
      .set(auth(ctx.a.adminToken))
      .field('academicYearId', ctx.a.yearId)
      .attach('file', Buffer.from('x'), 'students.txt');
    expect(res.status).toBe(400);
  });
});
