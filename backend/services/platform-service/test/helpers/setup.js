/**
 * Test harness for the Teacher APK.
 *
 * Connects to an ephemeral Mongo — `mongodb-memory-server` if installed,
 * otherwise `process.env.MONGO_URI_TEST` (must be a throwaway DB) — builds a
 * two-school academic graph, and returns the ids + a signed teacher token.
 *
 * Requires: `npm i -D vitest supertest mongodb-memory-server`
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../../src/config/env.js';

let memoryServer = null;

export async function connect() {
  if (mongoose.connection.readyState === 1) return;
  let uri = process.env.MONGO_URI_TEST || '';
  if (!uri) {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
    } catch {
      throw new Error(
        'No test database. Install mongodb-memory-server (npm i -D mongodb-memory-server) or set MONGO_URI_TEST to a throwaway database.'
      );
    }
  }
  await mongoose.connect(uri);
}

export async function disconnect() {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

const oid = () => new mongoose.Types.ObjectId();

async function buildSchool(models, name, slug) {
  const { School, AcademicYear, SchoolClass, Section, Subject, SectionSubject, Teacher, Student, StudentEnrollment } = models;
  const school = await School.create({
    name,
    code: slug.toUpperCase(),
    schoolId: slug,
    type: 'Private',
    board: 'CBSE',
    contact: { email: `info@${slug}.edu`, phone: '+919999999999' },
    address: { line1: 'x', city: 'x', state: 'x', country: 'India', pincode: '000000' },
    academic: { session: '2026-27', classFrom: '1', classTo: '10', medium: 'English', workingDays: [] },
    admin: { name: 'Admin', email: `admin@${slug}.edu`, mobile: '+919999999999' },
    status: 'Active',
    settings: { safePickupEnabled: true },
  });

  const year = await AcademicYear.create({
    schoolId: school._id, name: '2026-27', code: 'AY2627', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'),
    status: 'ACTIVE', isCurrent: true,
  });
  const cls = await SchoolClass.create({
    schoolId: school._id, academicYearId: year._id, name: 'Class 10', code: 'C10', numericOrder: 10,
    safePickupEnabled: true,
  });
  const subject = await Subject.create({ schoolId: school._id, name: 'English', code: 'ENG' });
  const teacher = await Teacher.create({
    schoolId: school._id, employeeId: 'TCH-1', name: 'Test Teacher', firstName: 'Test', lastName: 'Teacher',
    email: `teacher@${slug}.edu`, mobileNumber: '9999999999', status: 'ACTIVE',
    passwordHash: await bcrypt.hash('Passw0rd!', 10),
    account: { createLoginAccount: true, loginEmail: `teacher@${slug}.edu`, accountStatus: 'ACTIVE' },
  });
  const section = await Section.create({
    schoolId: school._id, academicYearId: year._id, classId: cls._id, name: 'A', capacity: 40, classTeacherId: teacher._id,
  });
  await SectionSubject.create({
    schoolId: school._id, academicYearId: year._id, classId: cls._id, sectionId: section._id, subjectId: subject._id,
    teacherId: teacher._id, status: 'ACTIVE',
  });
  const student = await Student.create({
    schoolId: school._id, admissionNumber: `ADM-${slug}-1`, firstName: 'Sam', lastName: 'Student', status: 'ACTIVE',
    parentName: 'Sam Parent', parentPhone: '9876500000',
  });
  // A second student with NO guardian mobile — for the PARENT_MOBILE_NOT_FOUND path.
  const studentNoGuardian = await Student.create({
    schoolId: school._id, admissionNumber: `ADM-${slug}-2`, firstName: 'Nomo', lastName: 'Guardian', status: 'ACTIVE',
    parentName: '', parentPhone: '',
  });
  await StudentEnrollment.create({
    schoolId: school._id, studentId: studentNoGuardian._id, academicYearId: year._id, classId: cls._id,
    sectionId: section._id, rollNumber: '2', status: 'ACTIVE',
  });
  await StudentEnrollment.create({
    schoolId: school._id, studentId: student._id, academicYearId: year._id, classId: cls._id, sectionId: section._id,
    rollNumber: '1', status: 'ACTIVE',
  });

  const token = signAccessToken(
    { sub: teacher._id.toString(), userId: teacher._id.toString(), teacherId: teacher._id.toString(), schoolId: school._id.toString(), role: 'TEACHER', name: teacher.name, email: teacher.email },
    { secret: env.jwtSecret, expiresIn: '1h' }
  );

  // ---- Student APK fixtures: login creds + one row per screen ----
  const { Homework, Exam, ExamResult, FeeInvoice, Announcement, StudentAttendance } = models;
  student.passwordHash = await bcrypt.hash('Student@1', 10);
  student.account = { createLoginAccount: true, loginEmail: `student@${slug}.edu`, username: 'student', accountStatus: 'ACTIVE' };
  await student.save();

  const homework = await Homework.create({
    schoolId: school._id, academicYearId: year._id, classId: cls._id, className: cls.name,
    sectionId: section._id, sectionName: section.name, subjectId: subject._id, subjectName: subject.name,
    teacherId: teacher._id, teacherName: teacher.name, title: 'HW Ch 1',
    assignedDate: new Date(Date.now() - 2 * 86400000), dueDate: new Date(Date.now() + 3 * 86400000), status: 'ASSIGNED',
  });
  const exam = await Exam.create({
    schoolId: school._id, academicYearId: year._id, name: 'Unit Test 1', examType: 'UNIT_TEST',
    startDate: new Date(Date.now() - 20 * 86400000), endDate: new Date(Date.now() - 14 * 86400000),
    classIds: [cls._id], gradingType: 'PERCENTAGE', status: 'PUBLISHED',
  });
  const examDraft = await Exam.create({
    schoolId: school._id, academicYearId: year._id, name: 'Unit Test 2', examType: 'UNIT_TEST',
    startDate: new Date(Date.now() + 10 * 86400000), endDate: new Date(Date.now() + 12 * 86400000),
    classIds: [cls._id], gradingType: 'PERCENTAGE', status: 'SCHEDULED',
  });
  const result = await ExamResult.create({
    schoolId: school._id, examId: exam._id, academicYearId: year._id, classId: cls._id, sectionId: section._id,
    studentId: student._id, rollNumber: '1', totalMarks: 82, maxTotalMarks: 100, percentage: 82, grade: 'A',
    result: 'PASS', rank: 3,
    subjectResults: [{ subjectId: subject._id, subjectName: subject.name, marksObtained: 82, maxMarks: 100, passingMarks: 33, grade: 'A', isPassed: true }],
  });
  // a result the student must NOT see (exam not published)
  await ExamResult.create({
    schoolId: school._id, examId: examDraft._id, academicYearId: year._id, classId: cls._id, sectionId: section._id,
    studentId: student._id, rollNumber: '1', totalMarks: 50, maxTotalMarks: 100, percentage: 50, grade: 'C', result: 'PASS',
  });
  const enrollmentDoc = await StudentEnrollment.findOne({ schoolId: school._id, studentId: student._id, academicYearId: year._id });
  const invoice = await FeeInvoice.create({
    schoolId: school._id, studentId: student._id, enrollmentId: enrollmentDoc._id, academicYearId: year._id,
    invoiceNumber: `INV-${slug.toUpperCase()}-1`, periodLabel: 'Term 1',
    periodStart: new Date(Date.now() - 30 * 86400000), periodEnd: new Date(Date.now() + 60 * 86400000),
    dueDate: new Date(Date.now() + 10 * 86400000),
    items: [{ feeHeadName: 'Tuition Fee', originalAmount: 8000, discountAmount: 0, finalAmount: 8000 }],
    totalAmount: 8000, paidAmount: 0, balanceAmount: 8000, status: 'PENDING',
  });
  const notice = await Announcement.create({
    schoolId: school._id, title: 'Welcome', body: 'Term begins Monday', audiences: ['STUDENTS'],
    status: 'PUBLISHED', publishedByName: 'Office', publishAt: new Date(Date.now() - 86400000),
  });
  // 3 days ago — deterministic and never collides with the teacher-attendance
  // test's use of the real "today" for the same section.
  const attnDate = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  await StudentAttendance.create({
    schoolId: school._id, academicYearId: year._id, classId: cls._id, className: cls.name,
    sectionId: section._id, sectionName: section.name, date: attnDate,
    entries: [
      { studentId: student._id, studentName: 'Sam Student', rollNumber: '1', status: 'PRESENT' },
      { studentId: studentNoGuardian._id, studentName: 'Nomo Guardian', rollNumber: '2', status: 'ABSENT' },
    ],
  });

  const studentToken = signAccessToken(
    { sub: student._id.toString(), userId: student._id.toString(), studentId: student._id.toString(), schoolId: school._id.toString(), role: 'STUDENT', name: 'Sam Student', admissionNumber: student.admissionNumber },
    { secret: env.jwtSecret, expiresIn: '1h' }
  );

  // ---- Parent APK fixtures: one Parent linked to `student` (not studentNoGuardian) ----
  const { Parent, ParentStudent } = models;
  const parent = await Parent.create({
    schoolId: school._id,
    firstName: 'Pat',
    lastName: 'Parent',
    email: `parent@${slug}.edu`,
    phone: `9876${slug === 'schoola' ? '111111' : '222222'}`,
    status: 'ACTIVE',
    passwordHash: await bcrypt.hash('Parent@1', 10),
    account: { createLoginAccount: true, loginEmail: `parent@${slug}.edu`, username: 'parent', accountStatus: 'ACTIVE' },
  });
  await ParentStudent.create({
    schoolId: school._id, parentId: parent._id, studentId: student._id, relationship: 'FATHER', isPrimary: true, status: 'ACTIVE',
  });
  const parentToken = signAccessToken(
    { sub: parent._id.toString(), userId: parent._id.toString(), parentId: parent._id.toString(), schoolId: school._id.toString(), role: 'PARENT', name: 'Pat Parent', phone: parent.phone },
    { secret: env.jwtSecret, expiresIn: '1h' }
  );

  return {
    schoolId: school._id.toString(),
    yearId: year._id.toString(),
    classId: cls._id.toString(),
    sectionId: section._id.toString(),
    subjectId: subject._id.toString(),
    teacherId: teacher._id.toString(),
    studentId: student._id.toString(),
    studentNoGuardianId: studentNoGuardian._id.toString(),
    token,
    studentToken,
    studentLoginEmail: `student@${slug}.edu`,
    studentPassword: 'Student@1',
    parentToken,
    parentId: parent._id.toString(),
    parentLoginEmail: `parent@${slug}.edu`,
    parentPhone: parent.phone,
    parentPassword: 'Parent@1',
    homeworkId: homework._id.toString(),
    examId: exam._id.toString(),
    examDraftId: examDraft._id.toString(),
    resultId: result._id.toString(),
    invoiceId: invoice._id.toString(),
    noticeId: notice._id.toString(),
    adminToken: signAccessToken(
      { sub: school._id.toString(), role: 'SchoolAdmin', schoolId: school.schoolId, name: 'Admin' },
      { secret: env.jwtSecret, expiresIn: '1h' }
    ),
  };
}

export async function seed() {
  const models = {
    School: (await import('../../src/models/School.js')).School,
    AcademicYear: (await import('../../src/models/AcademicYear.js')).AcademicYear,
    SchoolClass: (await import('../../src/models/SchoolClass.js')).SchoolClass,
    Section: (await import('../../src/models/Section.js')).Section,
    Subject: (await import('../../src/models/Subject.js')).Subject,
    SectionSubject: (await import('../../src/models/SectionSubject.js')).SectionSubject,
    Teacher: (await import('../../src/models/Teacher.js')).Teacher,
    Student: (await import('../../src/models/Student.js')).Student,
    StudentEnrollment: (await import('../../src/models/StudentEnrollment.js')).StudentEnrollment,
    Homework: (await import('../../src/models/Homework.js')).Homework,
    Exam: (await import('../../src/models/Exam.js')).Exam,
    ExamResult: (await import('../../src/models/ExamResult.js')).ExamResult,
    FeeInvoice: (await import('../../src/models/FeeInvoice.js')).FeeInvoice,
    Announcement: (await import('../../src/models/Communication.js')).Announcement,
    StudentAttendance: (await import('../../src/models/StudentAttendance.js')).StudentAttendance,
    Parent: (await import('../../src/models/Parent.js')).Parent,
    ParentStudent: (await import('../../src/models/ParentStudent.js')).ParentStudent,
  };
  const a = await buildSchool(models, 'School A', 'schoola');
  const b = await buildSchool(models, 'School B', 'schoolb');
  return { a, b };
}

export async function getApp() {
  return (await import('../../src/app.js')).default;
}

export const badToken = 'Bearer eyJhbGciOiJIUzI1NiJ9.bad.bad';
