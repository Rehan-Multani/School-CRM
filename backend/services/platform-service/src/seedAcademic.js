import bcrypt from 'bcryptjs';
import { School } from './models/School.js';
import { Teacher } from './models/Teacher.js';
import { Subject } from './models/Subject.js';
import { AcademicYear } from './models/AcademicYear.js';
import { Section } from './models/Section.js';
import { SchoolClass } from './models/SchoolClass.js';
import { SectionSubject } from './models/SectionSubject.js';
import { TimetableEntry } from './models/TimetableEntry.js';
import { Student } from './models/Student.js';
import { StudentEnrollment } from './models/StudentEnrollment.js';
import { Homework } from './models/Homework.js';
import { Exam } from './models/Exam.js';
import { ExamResult } from './models/ExamResult.js';
import { FeeInvoice } from './models/FeeInvoice.js';
import { Announcement } from './models/Communication.js';

const TEACHER_LOGIN_PASSWORD = 'Teacher@123';
const STUDENT_LOGIN_PASSWORD = 'Student@123';

const DEFAULT_TEACHERS = [
  { employeeId: 'TCH-001', name: 'Rahul Sharma', email: 'rahul.sharma@school.local', department: 'Mathematics' },
  { employeeId: 'TCH-002', name: 'Amit Sharma', email: 'amit.sharma@school.local', department: 'Science' },
  { employeeId: 'TCH-003', name: 'Neha Sharma', email: 'neha.sharma@school.local', department: 'English' },
  { employeeId: 'TCH-004', name: 'Pooja Maam', email: 'pooja@school.local', department: 'Hindi' },
  { employeeId: 'TCH-005', name: 'Arjun Sharma', email: 'arjun.sharma@school.local', department: 'Computer Science' },
];

const DEFAULT_SUBJECTS = [
  { name: 'Mathematics', code: 'MATH', subjectType: 'THEORY' },
  { name: 'Science', code: 'SCI', subjectType: 'THEORY' },
  { name: 'English', code: 'ENG', subjectType: 'THEORY' },
  { name: 'Hindi', code: 'HIN', subjectType: 'THEORY' },
  { name: 'Social Science', code: 'SST', subjectType: 'THEORY' },
  { name: 'Computer', code: 'COMP', subjectType: 'PRACTICAL' },
  { name: 'Physical Education', code: 'PE', subjectType: 'ACTIVITY' },
];

function schoolLoginDomain(school) {
  const email = school?.contact?.email || '';
  if (email.includes('@')) return email.split('@')[1].toLowerCase();
  const slug = String(school?.schoolId || school?._id || 'school').toLowerCase().replace(/[^a-z0-9-]/g, '');
  return `${slug}.edu`;
}

export async function seedAcademicTeachers() {
  const schools = await School.find({}).select('_id name schoolId contact.email');
  let teachersCreated = 0;
  let subjectsCreated = 0;

  for (const school of schools) {
    const existingTeachers = await Teacher.countDocuments({ schoolId: school._id });
    if (existingTeachers === 0) {
      await Teacher.insertMany(
        DEFAULT_TEACHERS.map((teacher) => ({
          schoolId: school._id,
          ...teacher,
          phone: '',
          status: 'ACTIVE',
        }))
      );
      teachersCreated += DEFAULT_TEACHERS.length;
    }

    const existingSubjects = await Subject.countDocuments({ schoolId: school._id });
    if (existingSubjects === 0) {
      await Subject.insertMany(
        DEFAULT_SUBJECTS.map((subject) => ({
          schoolId: school._id,
          ...subject,
          maxMarks: 100,
          passingMarks: 33,
          description: '',
          status: 'ACTIVE',
        }))
      );
      subjectsCreated += DEFAULT_SUBJECTS.length;
    }
  }

  if (teachersCreated > 0) {
    console.log(`Academic teachers seeded: ${teachersCreated}`);
  }
  if (subjectsCreated > 0) {
    console.log(`Academic subjects seeded: ${subjectsCreated}`);
  }

  // Ensure every school has one Teacher APK login for testing.
  // Idempotent: only writes when passwordHash is still empty.
  let loginsProvisioned = 0;
  const passwordHash = await bcrypt.hash(TEACHER_LOGIN_PASSWORD, 10);
  for (const school of schools) {
    const teacher = await Teacher.findOne({ schoolId: school._id }).sort({ createdAt: 1 }).select('+passwordHash');
    if (!teacher) continue;
    // Per-school unique login email so `teacher@...` never collides across tenants.
    const loginEmail = `teacher@${schoolLoginDomain(school)}`;
    const needsHash = !teacher.passwordHash;
    const needsEmail = (teacher.account?.loginEmail || '') !== loginEmail;
    if (!needsHash && !needsEmail) continue;
    if (needsHash) teacher.passwordHash = passwordHash;
    teacher.status = 'ACTIVE';
    teacher.mustResetPassword = false;
    teacher.account = {
      ...(teacher.account || {}),
      createLoginAccount: true,
      loginEmail,
      username: teacher.account?.username || 'teacher',
      accountStatus: 'ACTIVE',
    };
    teacher.markModified('account');
    await teacher.save();
    loginsProvisioned += 1;
  }
  if (loginsProvisioned > 0) {
    console.log(`Teacher APK logins provisioned/updated: ${loginsProvisioned} (password: ${TEACHER_LOGIN_PASSWORD})`);
  }

  await ensureTeacherApkSampleData(schools);
  await ensureStudentApkData(schools);
}

/**
 * Give every school one Student APK login backed by enough real data that the
 * app renders on first run: an ACTIVE enrollment in the first section, one
 * homework, one PUBLISHED exam + result, one pending fee invoice, one
 * student-audienced announcement. Every write is guarded so re-running boot is
 * a no-op. Login: student@<school-domain> / Student@123.
 */
async function ensureStudentApkData(schools) {
  const passwordHash = await bcrypt.hash(STUDENT_LOGIN_PASSWORD, 10);
  let provisioned = 0;

  for (const school of schools) {
    const currentYear = await AcademicYear.findOne({ schoolId: school._id, isCurrent: true });
    const section = await Section.findOne({ schoolId: school._id }).sort({ createdAt: 1 });
    if (!currentYear || !section) continue;
    const cls = await SchoolClass.findOne({ schoolId: school._id, _id: section.classId });
    const subject = await Subject.findOne({ schoolId: school._id }).sort({ createdAt: 1 });
    const teacher = await Teacher.findOne({ schoolId: school._id }).sort({ createdAt: 1 });

    // 1. a student to own the login
    let student = await Student.findOne({ schoolId: school._id }).sort({ createdAt: 1 }).select('+passwordHash');
    if (!student) {
      student = await Student.create({
        schoolId: school._id,
        admissionNumber: `ADM-${String(school.schoolId || school._id).toUpperCase().slice(-6)}-001`,
        firstName: 'Rahul',
        lastName: 'Kumar',
        gender: 'MALE',
        dateOfBirth: new Date('2012-05-14'),
        parentName: 'Suresh Kumar',
        parentPhone: '9800000000',
        status: 'ACTIVE',
      });
      student = await Student.findById(student._id).select('+passwordHash');
    }

    // 2. login provisioning (idempotent)
    const loginEmail = `student@${schoolLoginDomain(school)}`;
    if (!student.passwordHash || (student.account?.loginEmail || '') !== loginEmail) {
      if (!student.passwordHash) student.passwordHash = passwordHash;
      student.status = 'ACTIVE';
      student.mustResetPassword = false;
      student.account = {
        ...(student.account || {}),
        createLoginAccount: true,
        loginEmail,
        username: student.account?.username || 'student',
        accountStatus: 'ACTIVE',
      };
      student.markModified('account');
      await student.save();
      provisioned += 1;
    }

    // 3. ACTIVE enrollment in the first section for the current year
    await StudentEnrollment.updateOne(
      { schoolId: school._id, studentId: student._id, academicYearId: currentYear._id },
      {
        $set: { classId: section.classId, sectionId: section._id, rollNumber: '1', status: 'ACTIVE' },
        $setOnInsert: {
          schoolId: school._id,
          studentId: student._id,
          academicYearId: currentYear._id,
          admissionNumber: student.admissionNumber,
          enrollmentDate: new Date(),
        },
      },
      { upsert: true }
    );
    const enrollment = await StudentEnrollment.findOne({ schoolId: school._id, studentId: student._id, academicYearId: currentYear._id });

    // 4. one homework for the section
    if (subject && teacher) {
      await Homework.updateOne(
        { schoolId: school._id, sectionId: section._id, title: 'Sample Homework — Chapter 1' },
        {
          $setOnInsert: {
            schoolId: school._id,
            academicYearId: currentYear._id,
            classId: section.classId,
            className: cls?.name || '',
            sectionId: section._id,
            sectionName: section.name || '',
            subjectId: subject._id,
            subjectName: subject.name || '',
            teacherId: teacher._id,
            teacherName: teacher.name || '',
            description: 'Complete exercises 1–10 and submit before the due date.',
            assignedDate: new Date(Date.now() - 2 * 86400000),
            dueDate: new Date(Date.now() + 3 * 86400000),
            status: 'ASSIGNED',
          },
        },
        { upsert: true }
      );
    }

    // 5. one PUBLISHED exam + a result for the student
    const examName = 'Unit Test 1';
    await Exam.updateOne(
      { schoolId: school._id, academicYearId: currentYear._id, name: examName },
      {
        $set: { status: 'PUBLISHED' },
        $setOnInsert: {
          schoolId: school._id,
          academicYearId: currentYear._id,
          name: examName,
          examType: 'UNIT_TEST',
          startDate: new Date(Date.now() - 20 * 86400000),
          endDate: new Date(Date.now() - 14 * 86400000),
          classIds: [section.classId],
          gradingType: 'PERCENTAGE',
        },
      },
      { upsert: true }
    );
    const exam = await Exam.findOne({ schoolId: school._id, academicYearId: currentYear._id, name: examName });
    if (exam && subject) {
      await ExamResult.updateOne(
        { examId: exam._id, studentId: student._id },
        {
          $setOnInsert: {
            schoolId: school._id,
            examId: exam._id,
            academicYearId: currentYear._id,
            classId: section.classId,
            sectionId: section._id,
            studentId: student._id,
            rollNumber: enrollment?.rollNumber || '1',
            totalMarks: 82,
            maxTotalMarks: 100,
            percentage: 82,
            grade: 'A',
            result: 'PASS',
            rank: 3,
            subjectResults: [
              {
                subjectId: subject._id,
                subjectName: subject.name || 'Subject',
                subjectCode: subject.code || '',
                marksObtained: 82,
                maxMarks: 100,
                passingMarks: 33,
                grade: 'A',
                isPassed: true,
                attendanceStatus: 'PRESENT',
              },
            ],
            remarks: 'Good performance. Keep it up.',
          },
        },
        { upsert: true }
      );
    }

    // 6. one pending fee invoice
    if (enrollment) {
      const invoiceNumber = `INV-${String(school.schoolId || school._id).toUpperCase().slice(-6)}-0001`;
      await FeeInvoice.updateOne(
        { schoolId: school._id, invoiceNumber },
        {
          $setOnInsert: {
            schoolId: school._id,
            studentId: student._id,
            enrollmentId: enrollment._id,
            academicYearId: currentYear._id,
            invoiceNumber,
            periodLabel: 'Term 1',
            periodStart: new Date(Date.now() - 30 * 86400000),
            periodEnd: new Date(Date.now() + 60 * 86400000),
            dueDate: new Date(Date.now() + 10 * 86400000),
            items: [
              { feeHeadName: 'Tuition Fee', originalAmount: 8000, discountAmount: 0, finalAmount: 8000 },
              { feeHeadName: 'Transport', originalAmount: 2000, discountAmount: 0, finalAmount: 2000 },
            ],
            totalAmount: 10000,
            paidAmount: 0,
            balanceAmount: 10000,
            status: 'PENDING',
          },
        },
        { upsert: true }
      );
    }

    // 7. one student-audienced announcement
    await Announcement.updateOne(
      { schoolId: school._id, title: 'Welcome to the new term' },
      {
        $set: { status: 'PUBLISHED' },
        $setOnInsert: {
          schoolId: school._id,
          title: 'Welcome to the new term',
          body: 'Classes resume Monday. Please check your timetable in the app.',
          audiences: ['STUDENTS'],
          publishedByName: 'School Office',
          publishAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  if (provisioned > 0) {
    console.log(`Student APK logins provisioned/updated: ${provisioned} (password: ${STUDENT_LOGIN_PASSWORD})`);
  }
}

/**
 * Give the provisioned APK teacher enough of an assignment graph that the app
 * renders real data: an active academic year, class-teacher of the first
 * section, one section-subject, and a light Mon/Wed/Fri timetable. Every write
 * is guarded so re-running boot is a no-op.
 */
async function ensureTeacherApkSampleData(schools) {
  const DAYS = ['MON', 'WED', 'FRI'];
  let wired = 0;
  for (const school of schools) {
    // 1. exactly one current academic year
    let currentYear = await AcademicYear.findOne({ schoolId: school._id, isCurrent: true });
    if (!currentYear) {
      currentYear = await AcademicYear.findOne({ schoolId: school._id }).sort({ startDate: -1, createdAt: -1 });
      if (currentYear) {
        await AcademicYear.updateOne({ _id: currentYear._id }, { $set: { isCurrent: true, status: 'ACTIVE' } });
      }
    }
    if (!currentYear) continue;

    const teacher = await Teacher.findOne({ schoolId: school._id, 'account.loginEmail': { $regex: /^teacher@/i } })
      .sort({ createdAt: 1 });
    if (!teacher) continue;

    const section = await Section.findOne({ schoolId: school._id }).sort({ createdAt: 1 });
    const subject = await Subject.findOne({ schoolId: school._id }).sort({ createdAt: 1 });
    if (!section || !subject) continue;
    const cls = await SchoolClass.findOne({ schoolId: school._id, _id: section.classId });

    // 2. class teacher of that section (only if still unassigned)
    if (!section.classTeacherId) {
      await Section.updateOne({ _id: section._id }, { $set: { classTeacherId: teacher._id } });
    }

    // 3. one section-subject taught by this teacher
    await SectionSubject.updateOne(
      { schoolId: school._id, academicYearId: section.academicYearId || currentYear._id, sectionId: section._id, subjectId: subject._id },
      {
        $set: { teacherId: teacher._id, status: 'ACTIVE' },
        $setOnInsert: {
          schoolId: school._id,
          academicYearId: section.academicYearId || currentYear._id,
          classId: section.classId,
          sectionId: section._id,
          subjectId: subject._id,
          maxMarks: 100,
          passingMarks: 33,
        },
      },
      { upsert: true }
    );

    // 4. light timetable
    for (let i = 0; i < DAYS.length; i += 1) {
      await TimetableEntry.updateOne(
        { schoolId: school._id, sectionId: section._id, dayOfWeek: DAYS[i], periodNumber: 1 },
        {
          $set: {
            academicYearId: section.academicYearId || currentYear._id,
            classId: section.classId,
            className: cls?.name || '',
            sectionName: section.name || '',
            subjectId: subject._id,
            subjectName: subject.name || '',
            teacherId: teacher._id,
            teacherName: teacher.name || '',
            startTime: '09:00',
            endTime: '09:45',
            room: cls ? `Room ${cls.name}` : 'Room 1',
            status: 'ACTIVE',
          },
          $setOnInsert: { schoolId: school._id, dayOfWeek: DAYS[i], periodNumber: 1 },
        },
        { upsert: true }
      );
    }
    wired += 1;
  }
  if (wired > 0) console.log(`Teacher APK sample assignment graph wired for ${wired} school(s)`);
}
