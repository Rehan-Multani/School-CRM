/**
 * Mobile-app demo school — realistic, clearly-fake data for testing the
 * Teacher / Student / Parent / Transport Manager flows end to end (lists, scrolling, pagination,
 * loading, empty states, alignment).
 *
 *   npm run seed:app-demo            create it (no-op if it already exists)
 *   npm run seed:app-demo -- --reset delete everything in the demo school, then recreate
 *   npm run seed:app-demo -- --remove delete it and stop
 *
 * Everything lives in ONE separate school (schoolId `app-demo`), so it never
 * mixes with real schools and `--remove` takes it all out again. The boot-time
 * academic seeder skips this school (see constants/demoSchool.js).
 *
<<<<<<< HEAD
 * App logins. Teacher and transport manager: email + password `Demo@12345`.
 * Student and parent: mobile number + SMS OTP (dev: the OTP is printed in this
 * service's log); the password still works on the web parent portal.
 *   admin@app-demo.example.com   Demo Admin  — school admin web panel (/school-admin)
 *   teacher.demo@example.com     Meera Kapoor — class teacher 10-A, Maths in 9-A/9-B/10-A/10-B
 *   9000022222                   Aarav Mehta  — student, Class 10-A, roll 1
 *   9000011111                   Rajiv Mehta  — parent of Aarav (10-A) and Anaya (9-A)
 *   transport.demo@example.com   Vikram Rathore — transport manager: 2 routes, today half picked up
 *   teacher.empty@example.com    Nisha Rao    — no classes (empty states)
 *   9000033333                   Ishaan Gupta — student, Class 8-A, which has no timetable/work/results
=======
 * Logins (all password `Demo@12345`):
 *   admin@app-demo.example.com Demo Admin  — school admin web panel (/school-admin)
 *   teacher.demo@example.com  Meera Kapoor — class teacher 10-A, Maths in 9-A/9-B/10-A/10-B
 *   student.demo@example.com  Aarav Mehta  — Class 10-A, roll 1
 *   parent.demo@example.com   Rajiv Mehta  — Aarav's father
 *   teacher.empty@example.com Nisha Rao    — no classes (empty states)
 *   student.empty@example.com Ishaan Gupta — Class 8-A, which has no timetable/work/results
>>>>>>> f2106951fb2cfc7c9c8ae055a1990f5b0f7919c2
 *
 * All names, numbers and addresses are invented. Never point this at production.
 */
import './config/timezone.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import sharp from 'sharp';
import { env } from './config/env.js';
import { DEMO_SCHOOL_SLUG } from './constants/demoSchool.js';
import { dropLegacyTransportIndexes } from './utils/legacyTransportIndexes.js';
import {
  ensureUploadDirs,
  studentUploadsDir,
  teacherUploadsDir,
  toStudentPhotoPublicPath,
  toTeacherPhotoPublicPath,
} from './utils/upload.utils.js';

const PASSWORD = 'Demo@12345';
const DAY = 86400000;
const here = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- helpers
// Deterministic PRNG so every run produces the same data.
let seedState = 20260930;
function rand() {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const daysFromToday = (n, hour = 9) => {
  const d = startOfToday();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
};
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Every model file, so --reset/--remove can clear every collection keyed by schoolId.
async function loadAllModels() {
  const dir = path.join(here, 'models');
  const out = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    Object.assign(out, await import(pathToFileURL(path.join(dir, file)).href));
  }
  return out;
}

async function removeDemoSchool(M) {
  const school = await M.School.findOne({ schoolId: DEMO_SCHOOL_SLUG }).select('_id').lean();
  if (!school) return false;
  let removed = 0;
  for (const name of mongoose.modelNames()) {
    const model = mongoose.model(name);
    if (name === 'School') continue;
    const p = model.schema.path('schoolId');
    if (!p) continue;
    // Most collections key by School._id; notifications/device tokens by the slug.
    const value = p.instance === 'ObjectId' ? school._id : DEMO_SCHOOL_SLUG;
    const res = await model.deleteMany({ schoolId: value });
    removed += res.deletedCount || 0;
  }
  await M.School.deleteOne({ _id: school._id });
  console.log(`Removed demo school and ${removed} related documents.`);
  return true;
}

// Initials avatar as a small WebP (256px) — the app shows 40–96px avatars.
async function avatar(dir, publicPath, key, initials, color) {
  const file = `demo-${key}.webp`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
    <rect width="256" height="256" fill="${color}"/>
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif"
      font-size="104" font-weight="700" fill="#FFFFFF">${initials}</text></svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(path.join(dir, file));
  return publicPath(file);
}
const AVATAR_COLORS = ['#0F766E', '#7C3AED', '#DB2777', '#EA580C', '#2563EB', '#16A34A', '#9333EA', '#0891B2'];

// ---------------------------------------------------------------- fake people
const BOY = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Reyansh', 'Kabir', 'Dhruv', 'Ishaan', 'Krish', 'Rohan', 'Aryan', 'Vihaan', 'Ayaan', 'Kunal', 'Siddharth', 'Yash', 'Pranav', 'Rudra', 'Shaurya', 'Atharv', 'Harsh', 'Nikhil', 'Varun', 'Samar'];
const GIRL = ['Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Myra', 'Kiara', 'Ira', 'Riya', 'Anika', 'Navya', 'Tara', 'Meher', 'Avni', 'Pari', 'Sara', 'Kavya', 'Nisha', 'Pooja', 'Sneha', 'Tanvi', 'Zoya', 'Aditi', 'Ishita', 'Mahi'];
const LAST = ['Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Iyer', 'Nair', 'Reddy', 'Joshi', 'Kulkarni', 'Mehta', 'Chopra', 'Bose', 'Das', 'Khan', 'Malhotra', 'Pillai', 'Rao', 'Saxena', 'Trivedi', 'Agarwal', 'Bhatt', 'Menon', 'Shah'];

const SUBJECTS = [
  { key: 'MATH', name: 'Mathematics', code: 'MATH', type: 'THEORY' },
  { key: 'SCI', name: 'Science', code: 'SCI', type: 'THEORY' },
  { key: 'ENG', name: 'English', code: 'ENG', type: 'THEORY' },
  { key: 'HIN', name: 'Hindi', code: 'HIN', type: 'THEORY' },
  { key: 'SST', name: 'Social Science', code: 'SST', type: 'THEORY' },
  { key: 'COMP', name: 'Computer Science', code: 'COMP', type: 'PRACTICAL' },
];

// Homework / assignment titles per subject (realistic school work).
const WORK = {
  MATH: ['Quadratic equations — Exercise 4.2', 'Arithmetic progressions worksheet', 'Coordinate geometry: distance formula', 'Trigonometric ratios practice', 'Surface areas & volumes problems', 'Statistics: mean of grouped data', 'Polynomials — zeroes and coefficients', 'Pair of linear equations word problems', 'Probability: 15 practice questions', 'Circles: tangent theorems proof'],
  SCI: ['Chemical reactions — balance 20 equations', 'Life processes: diagram of human heart', 'Light: reflection ray diagrams', 'Acids, bases and salts lab report', 'Electricity: Ohm\'s law numericals', 'Carbon compounds — naming practice', 'Heredity and evolution notes', 'Magnetic effects of current — Q&A'],
  ENG: ['Letter to the editor: plastic ban', 'A Letter to God — character sketch', 'Grammar: reported speech worksheet', 'Poem analysis: Dust of Snow', 'Essay: My role model', 'Reading comprehension set 3', 'Story writing: a rainy day'],
  HIN: ['पत्र लेखन: प्रधानाचार्य को प्रार्थना पत्र', 'कबीर की साखी — अर्थ लिखिए', 'व्याकरण: संधि विच्छेद अभ्यास', 'निबंध: स्वच्छ भारत अभियान', 'अपठित गद्यांश अभ्यास'],
  SST: ['Map work: major rivers of India', 'Rise of nationalism in Europe — timeline', 'Resources and development notes', 'Power sharing: case study questions', 'Agriculture — crop seasons chart', 'Money and credit — short answers'],
  COMP: ['HTML page with a table and form', 'Python: loops practice programs', 'Cyber safety poster', 'Spreadsheet: marks analysis with formulas', 'Python: lists and dictionaries'],
};

async function demoPlan(M) {
  const plan =
    (await M.SubscriptionPlan.findOne({ name: 'Growth Plan' }).lean()) ||
    (await M.SubscriptionPlan.findOne({}).sort({ price: -1 }).lean());
  if (!plan) return {};
  return {
    subscriptionPlan: plan.name,
    subscription: {
      planId: plan._id, planType: plan.planType || 'Yearly', startedAt: daysFromToday(-30),
      endsAt: daysFromToday(335), status: 'Active',
    },
  };
}

// ---------------------------------------------------------------- seed
async function seed(M) {
  ensureUploadDirs();
  const hash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date();

  const school = await M.School.create({
    name: 'Sunrise Demo Public School',
    code: 'APPDEMO',
    schoolId: DEMO_SCHOOL_SLUG,
    type: 'Private',
    board: 'CBSE',
    contact: { email: 'office@app-demo.example.com', phone: '+910000000000' },
    address: { line1: '12 Demo Lane', city: 'Sampleville', state: 'Demo State', country: 'India', pincode: '000000' },
    academic: { session: '2026-27', classFrom: '8', classTo: '10', medium: 'English', workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] },
    // Admin panel login too (same password), so the school's web side can be checked.
    admin: { name: 'Demo Admin', email: 'admin@app-demo.example.com', mobile: '+910000000000', passwordHash: hash, hasLogin: true },
    status: 'Active',
    // Recommended platform palette: Indigo 600 primary.
    settings: { primaryColor: '#4F46E5', theme: 'light', safePickupEnabled: false },
    // A plan without Razorpay (no SchoolSubscription row, so no billing cron
    // touches it) — otherwise the admin panel only shows "choose a plan".
    ...(await demoPlan(M)),
  });
  const S = school._id;

  const year = await M.AcademicYear.create({
    schoolId: S, name: '2026-27', code: 'AY2627', startDate: new Date('2026-04-01'), endDate: new Date('2027-03-31'),
    status: 'ACTIVE', isCurrent: true,
  });
  const Y = year._id;

  const subjects = {};
  for (const s of SUBJECTS) {
    subjects[s.key] = await M.Subject.create({ schoolId: S, name: s.name, code: s.code, subjectType: s.type, status: 'ACTIVE' });
  }

  // ---- teachers (first-created teacher is a non-app HOD, see header note)
  const mkTeacher = (i, name, email, dept, login = false, extra = {}) => {
    const [firstName, ...rest] = name.split(' ');
    return M.Teacher.create({
      schoolId: S, employeeId: `DEMO-T${String(i).padStart(2, '0')}`, name, firstName, lastName: rest.join(' '),
      email, mobileNumber: `90000100${String(i).padStart(2, '0')}`, department: dept, status: 'ACTIVE',
      ...(login
        ? { passwordHash: hash, account: { createLoginAccount: true, loginEmail: email, accountStatus: 'ACTIVE' } }
        : {}),
      ...extra,
    });
  };
  const hod = await mkTeacher(1, 'Rohan Verma', 'rohan.verma@app-demo.example.com', 'Science');
  const demoTeacher = await mkTeacher(2, 'Meera Kapoor', 'teacher.demo@example.com', 'Mathematics', true, {
    designation: 'Senior Teacher (PGT)',
    experienceSummary: '9 years teaching Mathematics to Classes 8–12.',
    qualifications: [
      { degree: 'M.Sc.', specialization: 'Mathematics', institution: 'Demo University', passingYear: 2015, score: 'First Division' },
      { degree: 'B.Ed.', specialization: 'Mathematics', institution: 'Demo College of Education', passingYear: 2016 },
    ],
  });
  const emptyTeacher = await mkTeacher(3, 'Nisha Rao', 'teacher.empty@example.com', 'Arts', true);
  const others = {
    ENG: await mkTeacher(4, 'Kavita Nair', 'kavita.nair@app-demo.example.com', 'English'),
    HIN: await mkTeacher(5, 'Suresh Yadav', 'suresh.yadav@app-demo.example.com', 'Hindi'),
    SST: await mkTeacher(6, 'Farah Khan', 'farah.khan@app-demo.example.com', 'Social Science'),
    COMP: await mkTeacher(7, 'Vikram Joshi', 'vikram.joshi@app-demo.example.com', 'Computer Science'),
  };
  const teacherFor = (subjectKey) => (subjectKey === 'MATH' ? demoTeacher : subjectKey === 'SCI' ? hod : others[subjectKey]);

  demoTeacher.profilePhoto = await avatar(teacherUploadsDir, toTeacherPhotoPublicPath, 'teacher-meera', 'MK', '#0F766E');
  await demoTeacher.save();

  // ---- classes & sections
  const classes = {};
  for (const n of [8, 9, 10]) {
    classes[n] = await M.SchoolClass.create({ schoolId: S, academicYearId: Y, name: `Class ${n}`, code: `C${n}`, numericOrder: n });
  }
  const SECTION_PLAN = [
    { cls: 8, name: 'A', size: 30, teacher: null, active: false }, // the empty-state section
    { cls: 9, name: 'A', size: 38, teacher: others.ENG, active: true },
    { cls: 9, name: 'B', size: 34, teacher: others.HIN, active: true },
    { cls: 10, name: 'A', size: 40, teacher: demoTeacher, active: true },
    { cls: 10, name: 'B', size: 36, teacher: others.SST, active: true },
  ];
  const sections = [];
  for (const p of SECTION_PLAN) {
    const cls = classes[p.cls];
    const doc = await M.Section.create({
      schoolId: S, academicYearId: Y, classId: cls._id, name: p.name, capacity: 45,
      classTeacherId: p.teacher?._id || null, status: 'ACTIVE',
    });
    sections.push({ ...p, doc, cls, label: `${cls.name} - ${p.name}` });
  }
  const active = sections.filter((s) => s.active);

  // Subjects taught in every active section.
  await M.SectionSubject.insertMany(
    active.flatMap((sec) =>
      SUBJECTS.map((sub) => ({
        schoolId: S, academicYearId: Y, classId: sec.cls._id, sectionId: sec.doc._id,
        subjectId: subjects[sub.key]._id, teacherId: teacherFor(sub.key)._id, status: 'ACTIVE',
      })),
    ),
  );

  // ---- students & enrollments
  let admission = 1;
  const roster = new Map(); // sectionId -> [{ student, roll, name, rate }]
  let demoStudent = null;
  let emptyStudent = null;
  let siblingStudent = null;
  for (const sec of sections) {
    const list = [];
    for (let r = 1; r <= sec.size; r += 1) {
      const isDemo = sec.cls.numericOrder === 10 && sec.name === 'A' && r === 1;
      const isEmpty = sec.cls.numericOrder === 8 && r === 1;
      // The demo parent's second child (Class 9-A) — so the child switcher has something to switch.
      const isSibling = sec.cls.numericOrder === 9 && sec.name === 'A' && r === 1;
      const girl = isSibling || (!isDemo && !isEmpty && rand() < 0.5);
      const firstName = isDemo ? 'Aarav' : isSibling ? 'Anaya' : isEmpty ? 'Ishaan' : pick(girl ? GIRL : BOY);
      const lastName = isDemo || isSibling ? 'Mehta' : isEmpty ? 'Gupta' : pick(LAST);
      const parentFirst = pick(['Rajesh', 'Sunil', 'Anil', 'Manoj', 'Deepak', 'Sanjay', 'Vijay', 'Ashok', 'Rakesh', 'Prakash']);
      const student = {
        schoolId: S,
        admissionNumber: `DEMO-2026-${String(admission).padStart(3, '0')}`,
        firstName, lastName, gender: girl ? 'FEMALE' : 'MALE',
        dateOfBirth: new Date(2026 - sec.cls.numericOrder - 5, between(0, 11), between(1, 28)),
        parentName: isDemo || isSibling ? 'Rajiv Mehta' : `${parentFirst} ${lastName}`,
        parentPhone: `9000${String(200000 + admission).padStart(6, '0')}`,
        address: `${between(1, 200)} Demo Nagar, Sampleville`,
        status: 'ACTIVE',
      };
      if (isDemo || isEmpty) {
        const email = isDemo ? 'student.demo@example.com' : 'student.empty@example.com';
        Object.assign(student, {
          // The student app signs in with the student's own mobile + OTP.
          phone: isDemo ? '9000022222' : '9000033333',
          email, passwordHash: hash,
          account: { createLoginAccount: true, loginEmail: email, username: isDemo ? 'student.demo' : 'student.empty', accountStatus: 'ACTIVE' },
        });
      }
      admission += 1;
      list.push({ data: student, roll: String(r), girl, isDemo, isEmpty, isSibling, rate: isDemo ? 0.93 : isSibling ? 0.88 : 0.78 + rand() * 0.2 });
    }
    const docs = await M.Student.insertMany(list.map((x) => x.data));
    list.forEach((x, i) => {
      x.student = docs[i];
      x.name = `${docs[i].firstName} ${docs[i].lastName}`;
    });
    await M.StudentEnrollment.insertMany(
      list.map((x) => ({
        schoolId: S, studentId: x.student._id, academicYearId: Y, classId: sec.cls._id, sectionId: sec.doc._id,
        rollNumber: x.roll, admissionNumber: x.student.admissionNumber, status: 'ACTIVE', enrollmentDate: new Date('2026-04-01'),
      })),
    );
    roster.set(String(sec.doc._id), list);
    demoStudent = demoStudent || list.find((x) => x.isDemo)?.student || null;
    emptyStudent = emptyStudent || list.find((x) => x.isEmpty)?.student || null;
    siblingStudent = siblingStudent || list.find((x) => x.isSibling)?.student || null;
  }

  // Photos: the demo accounts + about a third of each class (lists show a mix
  // of photos and initials, like a real school).
  for (const [i, x] of [...roster.values()].flat().entries()) {
    if (!x.isDemo && !x.isSibling && rand() > 0.33) continue;
    const initials = `${x.student.firstName[0]}${(x.student.lastName || ' ')[0]}`.toUpperCase();
    const photo = await avatar(studentUploadsDir, toStudentPhotoPublicPath, `student-${x.student.admissionNumber}`, initials, AVATAR_COLORS[i % AVATAR_COLORS.length]);
    await M.Student.updateOne({ _id: x.student._id }, { $set: { photo } });
  }

  // ---- parent of the demo student
  const parent = await M.Parent.create({
    schoolId: S, firstName: 'Rajiv', lastName: 'Mehta', email: 'parent.demo@example.com', phone: '9000011111',
    status: 'ACTIVE', passwordHash: hash,
    account: { createLoginAccount: true, loginEmail: 'parent.demo@example.com', username: 'parent.demo', accountStatus: 'ACTIVE' },
  });
  await M.ParentStudent.insertMany([
    { schoolId: S, parentId: parent._id, studentId: demoStudent._id, relationship: 'FATHER', isPrimary: true, status: 'ACTIVE' },
    { schoolId: S, parentId: parent._id, studentId: siblingStudent._id, relationship: 'FATHER', isPrimary: false, status: 'ACTIVE' },
  ]);

  // ---- transport: manager login, 2 buses with drivers, 2 routes, riders, and a part-done day
  const manager = await M.SchoolUser.create({
    schoolId: S, employeeId: 'DEMO-TM-01', firstName: 'Vikram', lastName: 'Rathore', name: 'Vikram Rathore',
    email: 'transport.demo@example.com', passwordHash: hash, role: 'TRANSPORT', phone: '9000044444',
    designation: 'Transport Manager', department: 'Transport', status: 'ACTIVE', joiningDate: new Date('2024-06-01'),
  });
  const ROUTES = [
    { name: 'Route 1 — Demo Nagar', bus: 'MP09DM0101', driver: ['Suresh Yadav', '9000055501', 'MP0920200001001'], stops: [['Demo Nagar Gate', '07:10 AM', '03:40 PM'], ['Sample Chowk', '07:20 AM', '03:30 PM'], ['Lake View Colony', '07:32 AM', '03:18 PM']] },
    { name: 'Route 2 — Old City', bus: 'MP09DM0202', driver: ['Imran Sheikh', '9000055502', 'MP0920200001002'], stops: [['Old City Square', '07:05 AM', '03:45 PM'], ['Railway Colony', '07:18 AM', '03:32 PM'], ['Green Park', '07:30 AM', '03:20 PM']] },
  ];
  const sectionRoster = (order, name) => roster.get(String(sections.find((x) => x.cls.numericOrder === order && x.name === name).doc._id));
  // Route 1 carries the first eight of 10-A (Aarav among them), route 2 of 9-A (Anaya).
  const riders = [sectionRoster(10, 'A').slice(0, 8), sectionRoster(9, 'A').slice(0, 8)];
  let transportRiders = 0;
  for (const [i, r] of ROUTES.entries()) {
    const vehicle = await M.Vehicle.create({ schoolId: S, vehicleNumber: r.bus, vehicleType: 'SCHOOL_BUS', capacity: 40, model: 'Tata Starbus', status: 'ACTIVE' });
    const driver = await M.Driver.create({ schoolId: S, name: r.driver[0], mobile: r.driver[1], licenseNumber: r.driver[2], vehicleId: vehicle._id, status: 'ACTIVE' });
    const route = await M.TransportRoute.create({ schoolId: S, routeName: r.name, vehicleId: vehicle._id, driverId: driver._id, status: 'ACTIVE' });
    const stops = await M.RouteStop.insertMany(
      r.stops.map(([stopName, pickupTime, dropTime], n) => ({ schoolId: S, routeId: route._id, stopName, sequenceOrder: n + 1, pickupTime, dropTime })),
    );
    const stopOf = (n) => stops[n % stops.length]._id;
    await M.StudentTransportAssignment.insertMany(
      riders[i].map((x, n) => ({ schoolId: S, studentId: x.student._id, routeId: route._id, stopId: stopOf(n), academicYearId: Y, status: 'ACTIVE' })),
    );
    transportRiders += riders[i].length;
    // Yesterday: the whole run done. Today: the first stops are picked up, nobody dropped yet.
    const day = (offset, hour, minute) => {
      const d = daysFromToday(offset, hour);
      d.setMinutes(minute);
      return d;
    };
    const status = (x, n, offset, dropped) => ({
      schoolId: S, date: ymd(daysFromToday(offset)), studentId: x.student._id, routeId: route._id, stopId: stopOf(n),
      driverId: driver._id, markedByUserId: manager._id, pickupStatus: 'PICKED_UP', pickedUpAt: day(offset, 7, 10 + n * 3),
      ...(dropped ? { dropStatus: 'DROPPED', droppedAt: day(offset, 15, 20 + n * 3) } : {}),
    });
    await M.TransportDailyStatus.insertMany([
      ...riders[i].map((x, n) => status(x, n, -1, true)),
      ...riders[i].slice(0, 4).map((x, n) => status(x, n, 0, false)),
    ]);
  }

  // ---- timetable: MON–SAT, 6 periods; the demo teacher's Maths period never clashes across her 4 sections
  const PERIODS = [
    ['08:00', '08:45'], ['08:45', '09:30'], ['09:30', '10:15'], ['10:30', '11:15'], ['11:15', '12:00'], ['12:00', '12:45'],
  ];
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const timetable = [];
  active.forEach((sec, si) => {
    DAYS.forEach((day, di) => {
      const mathSlot = (si + di) % 6;
      const rest = SUBJECTS.filter((s) => s.key !== 'MATH');
      let k = (si + di) % rest.length;
      PERIODS.forEach(([start, end], pi) => {
        const sub = pi === mathSlot ? SUBJECTS[0] : rest[k++ % rest.length];
        const t = teacherFor(sub.key);
        timetable.push({
          schoolId: S, academicYearId: Y, classId: sec.cls._id, className: sec.cls.name, sectionId: sec.doc._id, sectionName: sec.name,
          subjectId: subjects[sub.key]._id, subjectName: subjects[sub.key].name, teacherId: t._id, teacherName: t.name,
          dayOfWeek: day, periodNumber: pi + 1, startTime: start, endTime: end,
          room: sub.key === 'COMP' ? 'Computer Lab' : sub.key === 'SCI' && pi % 2 ? 'Science Lab' : `Room ${100 + si + 1}`,
          status: 'ACTIVE',
        });
      });
    });
  });
  await M.TimetableEntry.insertMany(timetable);

  // ---- attendance: last ~6 weeks of school days (not today — left for the teacher to mark)
  const holidays = new Set([ymd(daysFromToday(-9))]); // one mid-period holiday
  const attendance = [];
  for (let back = 43; back >= 1; back -= 1) {
    const d = daysFromToday(-back);
    if (d.getDay() === 0 || holidays.has(ymd(d))) continue;
    for (const sec of active) {
      const entries = roster.get(String(sec.doc._id)).map((x) => {
        let status = 'PRESENT';
        if (rand() > x.rate) {
          const r = rand();
          status = r < 0.55 ? 'ABSENT' : r < 0.8 ? 'LATE' : r < 0.93 ? 'LEAVE' : 'HALF_DAY';
        }
        return { studentId: x.student._id, studentName: x.name, rollNumber: x.roll, status };
      });
      const marker = sec.teacher || demoTeacher;
      attendance.push({
        schoolId: S, academicYearId: Y, classId: sec.cls._id, className: sec.cls.name, sectionId: sec.doc._id, sectionName: sec.name,
        date: ymd(d), entries, markedById: marker._id, markedByName: marker.name,
        locked: back > 2, lockedAt: back > 2 ? d : null,
      });
    }
  }
  await M.StudentAttendance.insertMany(attendance);

  // ---- homework: ~every 4–6 days per subject per active section, plus a few due soon
  const homework = [];
  for (const sec of active) {
    for (const sub of SUBJECTS) {
      const titles = WORK[sub.key];
      let n = 0;
      for (let back = 40 - between(0, 4); back > -6; back -= between(4, 7)) {
        const t = teacherFor(sub.key);
        const assigned = daysFromToday(-back, 10);
        const due = daysFromToday(-back + between(2, 5), 23);
        homework.push({
          schoolId: S, academicYearId: Y, classId: sec.cls._id, className: sec.cls.name, sectionId: sec.doc._id, sectionName: sec.name,
          subjectId: subjects[sub.key]._id, subjectName: subjects[sub.key].name, teacherId: t._id, teacherName: t.name,
          title: titles[n % titles.length],
          description: `Complete in your ${sub.name} notebook. Show all steps neatly and submit on time.`,
          assignedDate: assigned, dueDate: due, status: due < daysFromToday(-7) ? 'CLOSED' : 'ASSIGNED',
          totalStudents: roster.get(String(sec.doc._id)).length, createdByName: t.name,
        });
        n += 1;
      }
    }
  }
  const hwDocs = await M.Homework.insertMany(homework.filter((h) => h.assignedDate <= now));
  const hwSubs = [];
  for (const hw of hwDocs) {
    const list = roster.get(String(hw.sectionId));
    const past = hw.dueDate < now;
    let submitted = 0;
    let graded = 0;
    for (const x of list) {
      // The demo student: mostly on time, a couple missed — so every status shows.
      const p = x.isDemo ? 0.85 : past ? 0.82 : 0.3;
      if (rand() > p) continue;
      const late = past && rand() < 0.12;
      const grade = past && rand() < 0.55;
      submitted += 1;
      if (grade) graded += 1;
      hwSubs.push({
        schoolId: S, homeworkId: hw._id, studentId: x.student._id, studentName: x.name, rollNumber: x.roll,
        status: grade ? 'GRADED' : late ? 'LATE' : 'SUBMITTED',
        submittedAt: new Date(Math.min(now.getTime(), hw.dueDate.getTime() + (late ? DAY : -between(1, 40) * 3600000))),
        remarks: grade ? pick(['Good work', 'Neat and complete', 'Revise step 3', 'Excellent!', 'Well done']) : '',
        marksObtained: grade ? between(5, 10) : null,
        gradedBy: grade ? hw.teacherId : null, gradedAt: grade ? hw.dueDate : null,
      });
    }
    hw.submittedCount = submitted;
    hw.evaluatedCount = graded;
  }
  await M.HomeworkSubmission.insertMany(hwSubs);
  await M.Homework.bulkWrite(
    hwDocs.map((hw) => ({ updateOne: { filter: { _id: hw._id }, update: { $set: { submittedCount: hw.submittedCount, evaluatedCount: hw.evaluatedCount } } } })),
  );

  // ---- assignments: the demo teacher's Maths in 4 sections + a few other subjects for 10-A
  const ASSIGN = [
    { sub: 'MATH', title: 'Project: Statistics of our class heights', back: 30, due: -16, max: 20, status: 'CLOSED' },
    { sub: 'MATH', title: 'Real numbers — HCF/LCM assignment', back: 18, due: -6, max: 25, status: 'PUBLISHED' },
    { sub: 'MATH', title: 'Trigonometry applications (heights & distances)', back: 6, due: 3, max: 25, status: 'PUBLISHED' },
    { sub: 'MATH', title: 'Mid-term revision problem set', back: 1, due: 8, max: 40, status: 'PUBLISHED' },
  ];
  const assignments = [];
  for (const sec of active) {
    for (const a of ASSIGN) assignments.push({ sec, ...a });
  }
  const tenA = active.find((s) => s.cls.numericOrder === 10 && s.name === 'A');
  assignments.push(
    { sec: tenA, sub: 'SCI', title: 'Model: working of the human eye', back: 20, due: -5, max: 30, status: 'PUBLISHED' },
    { sec: tenA, sub: 'ENG', title: 'Book review: any novel of your choice', back: 12, due: 5, max: 20, status: 'PUBLISHED' },
    { sec: tenA, sub: 'COMP', title: 'Build a quiz app in Python', back: 4, due: 12, max: 50, status: 'PUBLISHED' },
    { sec: tenA, sub: 'SST', title: 'Survey: sources of water in your area', back: 25, due: -10, max: 20, status: 'CLOSED' },
  );
  const asDocs = await M.Assignment.insertMany(
    assignments.map((a) => {
      const t = teacherFor(a.sub);
      return {
        schoolId: S, academicYearId: Y, classId: a.sec.cls._id, className: a.sec.cls.name, sectionId: a.sec.doc._id, sectionName: a.sec.name,
        subjectId: subjects[a.sub]._id, subjectName: subjects[a.sub].name, teacherId: t._id, teacherName: t.name,
        title: a.title, description: 'Read the instructions carefully. Submit a single PDF or clear photos of your work.',
        instructions: 'Write your name and roll number on every page.', maxMarks: a.max,
        assignedDate: daysFromToday(-a.back, 10), dueDate: daysFromToday(a.due, 23), status: a.status, createdByName: t.name,
      };
    }),
  );
  const asSubs = [];
  for (const as of asDocs) {
    const past = as.dueDate < now;
    let submitted = 0;
    let graded = 0;
    for (const x of roster.get(String(as.sectionId))) {
      if (rand() > (x.isDemo ? 0.8 : past ? 0.85 : 0.35)) continue;
      const grade = past && rand() < 0.7;
      submitted += 1;
      if (grade) graded += 1;
      asSubs.push({
        schoolId: S, assignmentId: as._id, studentId: x.student._id, studentName: x.name, rollNumber: x.roll,
        status: grade ? 'GRADED' : 'SUBMITTED', submittedAt: new Date(Math.min(now.getTime(), as.dueDate.getTime() - between(2, 60) * 3600000)),
        text: 'Submitted my work. Please check.',
        marksObtained: grade ? Math.round(as.maxMarks * (0.5 + rand() * 0.5)) : null,
        feedback: grade ? pick(['Well researched.', 'Good presentation, add more examples.', 'Excellent effort!', 'Check the calculations in Q4.']) : '',
        gradedBy: grade ? as.teacherId : null, gradedAt: grade ? as.dueDate : null,
      });
    }
    await M.Assignment.updateOne({ _id: as._id }, { $set: { submissionCount: submitted, gradedCount: graded } });
  }
  await M.AssignmentSubmission.insertMany(asSubs);

  // ---- exams (classes 9 & 10): UT1 published, Half-yearly marks entry open (2 Maths sheets still pending), UT2 upcoming
  const examClasses = [classes[9], classes[10]];
  const mkExam = (name, examType, start, end, status) =>
    M.Exam.create({
      schoolId: S, academicYearId: Y, name, examType, startDate: start, endDate: end,
      classIds: examClasses.map((c) => c._id), gradingType: 'PERCENTAGE', status,
    });
  const ut1 = await mkExam('Unit Test 1', 'UNIT_TEST', daysFromToday(-75), daysFromToday(-70), 'PUBLISHED');
  const half = await mkExam('Half Yearly Examination', 'HALF_YEARLY', daysFromToday(-16), daysFromToday(-6), 'IN_PROGRESS');
  const ut2 = await mkExam('Unit Test 2', 'UNIT_TEST', daysFromToday(12), daysFromToday(17), 'SCHEDULED');
  const EXAM_MAX = { [ut1._id]: [25, 9], [half._id]: [80, 27], [ut2._id]: [25, 9] };
  await M.ExamSubject.insertMany(
    [ut1, half, ut2].flatMap((ex) =>
      examClasses.flatMap((c) =>
        SUBJECTS.map((sub) => ({
          schoolId: S, examId: ex._id, classId: c._id, subjectId: subjects[sub.key]._id, subjectName: subjects[sub.key].name,
          subjectCode: sub.code, maxMarks: EXAM_MAX[ex._id][0], passingMarks: EXAM_MAX[ex._id][1],
        })),
      ),
    ),
  );
  await M.ExamSchedule.insertMany(
    examClasses.flatMap((c) =>
      SUBJECTS.map((sub, i) => ({
        schoolId: S, examId: ut2._id, classId: c._id, subjectId: subjects[sub.key]._id,
        examDate: daysFromToday(12 + i), startTime: '09:00 AM', endTime: '10:30 AM', room: `Hall ${c.numericOrder === 10 ? 1 : 2}`,
        invigilatorId: teacherFor(sub.key)._id, invigilatorName: teacherFor(sub.key).name, maxMarks: 25,
      })),
    ),
  );
  const grade = (pct) => (pct >= 91 ? 'A1' : pct >= 81 ? 'A2' : pct >= 71 ? 'B1' : pct >= 61 ? 'B2' : pct >= 51 ? 'C1' : pct >= 41 ? 'C2' : pct >= 33 ? 'D' : 'E');
  const marks = [];
  const results = [];
  for (const ex of [ut1, half]) {
    const [max, pass] = EXAM_MAX[ex._id];
    for (const sec of active) {
      // Half-yearly: the demo teacher still has to enter Maths for 9-B and 10-B (dashboard "pending marks").
      const skipMath = ex === half && sec.name === 'B';
      for (const x of roster.get(String(sec.doc._id))) {
        const ability = x.isDemo ? 0.84 : 0.45 + x.rate * 0.45 + (rand() - 0.5) * 0.2;
        const subjectResults = [];
        for (const sub of SUBJECTS) {
          if (skipMath && sub.key === 'MATH') continue;
          const absent = !x.isDemo && rand() < 0.02;
          const got = absent ? null : Math.max(0, Math.min(max, Math.round(max * Math.min(1, ability + (rand() - 0.5) * 0.25))));
          marks.push({
            schoolId: S, examId: ex._id, classId: sec.cls._id, sectionId: sec.doc._id, subjectId: subjects[sub.key]._id,
            studentId: x.student._id, marksObtained: got, maxMarks: max, passingMarks: pass,
            attendanceStatus: absent ? 'ABSENT' : 'PRESENT', remarks: '', gradedBy: teacherFor(sub.key)._id,
          });
          subjectResults.push({
            subjectId: subjects[sub.key]._id, subjectName: subjects[sub.key].name, marksObtained: got ?? 0, maxMarks: max,
            passingMarks: pass, grade: grade(((got ?? 0) / max) * 100), isPassed: (got ?? 0) >= pass,
          });
        }
        if (ex === ut1) {
          const total = subjectResults.reduce((a, s) => a + s.marksObtained, 0);
          const maxTotal = subjectResults.length * max;
          const pct = Math.round((total / maxTotal) * 1000) / 10;
          results.push({
            schoolId: S, examId: ex._id, academicYearId: Y, classId: sec.cls._id, sectionId: sec.doc._id, studentId: x.student._id,
            rollNumber: x.roll, totalMarks: total, maxTotalMarks: maxTotal, percentage: pct, grade: grade(pct),
            result: subjectResults.every((s) => s.isPassed) ? 'PASS' : 'COMPARTMENT', subjectResults,
          });
        }
      }
    }
  }
  await M.ExamMarks.insertMany(marks);
  // Rank within section for the published exam.
  for (const sec of active) {
    results
      .filter((r) => String(r.sectionId) === String(sec.doc._id))
      .sort((a, b) => b.totalMarks - a.totalMarks)
      .forEach((r, i) => {
        r.rank = i + 1;
      });
  }
  await M.ExamResult.insertMany(results);

  // ---- study material
  const MATERIAL = [
    ['MATH', 'Chapter 4 — Quadratic Equations notes', 'quadratic-equations-notes.pdf', 'application/pdf', 482000],
    ['MATH', 'Formula sheet: Trigonometry', 'trigonometry-formulas.pdf', 'application/pdf', 215000],
    ['MATH', 'Previous year board questions (2025)', 'board-2025-maths.pdf', 'application/pdf', 1320000],
    ['SCI', 'Chemical reactions — lab safety guide', 'lab-safety.pdf', 'application/pdf', 356000],
    ['ENG', 'Grammar: tenses quick reference', 'tenses-reference.pdf', 'application/pdf', 188000],
    ['SST', 'Map practice sheet — India', 'india-map-practice.pdf', 'application/pdf', 640000],
  ];
  await M.StudyMaterial.insertMany(
    active.flatMap((sec) =>
      MATERIAL.map(([sub, title, fileName, fileType, fileSize], i) => {
        const t = teacherFor(sub);
        return {
          schoolId: S, academicYearId: Y, classId: sec.cls._id, className: sec.cls.name, sectionId: sec.doc._id, sectionName: sec.name,
          subjectId: subjects[sub]._id, subjectName: subjects[sub].name, teacherId: t._id, teacherName: t.name,
          title, description: 'Revise this before the next class.', fileName, fileType, fileSize, url: '',
          visibility: 'SECTION', status: 'ACTIVE', createdAt: daysFromToday(-(i * 5 + 2)),
        };
      }),
    ),
  );

  // ---- notices & events
  const NOTICES = [
    ['Half-yearly results next week', 'Report cards for the half-yearly examination will be shared after the PTM.', ['ALL'], -1, true],
    ['Parent–Teacher Meeting on Saturday', 'PTM for Classes 8–10 from 9:00 AM to 12:00 PM. Attendance of parents is compulsory.', ['ALL'], -3, false],
    ['Unit Test 2 date sheet released', 'Unit Test 2 begins in two weeks. The date sheet is available in the Exams section.', ['STUDENTS', 'PARENTS'], -4, false],
    ['Staff meeting: syllabus review', 'All subject teachers to bring the syllabus completion status. Staff room, 1:15 PM.', ['TEACHERS'], -2, false],
    ['Library books due', 'Students must return all borrowed library books before the holidays.', ['STUDENTS'], -8, false],
    ['Winter uniform from next month', 'Winter uniform is compulsory from the 1st of next month.', ['ALL'], -12, false],
    ['Science exhibition registrations', 'Register your science project with your class teacher by Friday.', ['STUDENTS'], -15, false],
    ['Submit lesson plans', 'Weekly lesson plans for next week must be uploaded by Friday evening.', ['TEACHERS'], -6, false],
  ];
  await M.Announcement.insertMany(
    NOTICES.map(([title, body, audiences, back, pinned]) => ({
      schoolId: S, title, body, audiences, status: 'PUBLISHED', publishedByName: 'Principal’s Office',
      publishAt: daysFromToday(back, 8), pinned,
    })),
  );
  const EVENTS = [
    ['Annual Sports Day', 'Track events, relay races and prize distribution.', 'SPORTS', 9, 'School Ground'],
    ['Parent–Teacher Meeting', 'Discuss half-yearly performance with class teachers.', 'MEETING', 3, 'Respective classrooms'],
    ['Science Exhibition', 'Student projects from Classes 8–10.', 'ACADEMIC', 20, 'Main Hall'],
    ['Diwali Vacation', 'School closed for Diwali.', 'HOLIDAY', 28, ''],
    ['Inter-house Quiz', 'General knowledge quiz between the four houses.', 'CULTURAL', -10, 'Auditorium'],
  ];
  await M.Event.insertMany(
    EVENTS.map(([title, description, category, inDays, venue]) => ({
      schoolId: S, title, description, category, startAt: daysFromToday(inDays, 9), endAt: daysFromToday(inDays, category === 'HOLIDAY' ? 18 : 13),
      allDay: category === 'HOLIDAY', venue, audiences: ['ALL'], createdByName: 'Principal’s Office',
    })),
  );

  // ---- leaves
  const leaveBase = { schoolId: S, department: '' };
  await M.LeaveRequest.insertMany([
    { ...leaveBase, employeeRefId: demoTeacher._id, employeeType: 'TEACHER', employeeId: demoTeacher.employeeId, employeeName: demoTeacher.name, department: 'Mathematics', leaveType: 'CASUAL', startDate: daysFromToday(-20), endDate: daysFromToday(-20), totalDays: 1, reason: 'Family function', status: 'APPROVED', approvedAt: daysFromToday(-22) },
    { ...leaveBase, employeeRefId: demoTeacher._id, employeeType: 'TEACHER', employeeId: demoTeacher.employeeId, employeeName: demoTeacher.name, department: 'Mathematics', leaveType: 'MEDICAL', startDate: daysFromToday(6), endDate: daysFromToday(7), totalDays: 2, reason: 'Doctor appointment and follow-up', status: 'PENDING' },
    { ...leaveBase, employeeRefId: demoTeacher._id, employeeType: 'TEACHER', employeeId: demoTeacher.employeeId, employeeName: demoTeacher.name, department: 'Mathematics', leaveType: 'CASUAL', startDate: daysFromToday(-40), endDate: daysFromToday(-39), totalDays: 2, reason: 'Personal work', status: 'REJECTED', rejectionReason: 'Exam week — please reschedule' },
    { ...leaveBase, employeeRefId: demoStudent._id, employeeType: 'STUDENT', employeeId: demoStudent.admissionNumber, employeeName: 'Aarav Mehta', classId: tenA.cls._id, className: tenA.cls.name, sectionId: tenA.doc._id, sectionName: tenA.name, rollNumber: '1', leaveType: 'MEDICAL', startDate: daysFromToday(-12), endDate: daysFromToday(-11), totalDays: 2, reason: 'Fever', status: 'APPROVED', approvedAt: daysFromToday(-12) },
    { ...leaveBase, employeeRefId: demoStudent._id, employeeType: 'STUDENT', employeeId: demoStudent.admissionNumber, employeeName: 'Aarav Mehta', classId: tenA.cls._id, className: tenA.cls.name, sectionId: tenA.doc._id, sectionName: tenA.name, rollNumber: '1', leaveType: 'OTHER', startDate: daysFromToday(4), endDate: daysFromToday(4), totalDays: 1, reason: 'Cousin’s wedding', status: 'PENDING' },
  ]);

  // ---- fees (the demo parent's two children): paid term (with receipt), pending term, upcoming term
  const enrOf = async (student) => (await M.StudentEnrollment.findOne({ schoolId: S, studentId: student._id }).lean())._id;
  const enrollmentIds = { [demoStudent._id]: await enrOf(demoStudent), [siblingStudent._id]: await enrOf(siblingStudent) };
  const inv = (n, label, start, end, due, paid, student = demoStudent) => ({
    schoolId: S, studentId: student._id, enrollmentId: enrollmentIds[student._id], academicYearId: Y, invoiceNumber: `INV-DEMO-${n}`,
    periodLabel: label, periodStart: start, periodEnd: end, dueDate: due,
    items: [
      { feeHeadName: 'Tuition Fee', originalAmount: 18000, discountAmount: 0, finalAmount: 18000 },
      { feeHeadName: 'Computer Lab Fee', originalAmount: 1500, discountAmount: 0, finalAmount: 1500 },
      { feeHeadName: 'Sports & Activities', originalAmount: 1000, discountAmount: 500, finalAmount: 500 },
    ],
    totalAmount: 20000, paidAmount: paid, balanceAmount: 20000 - paid, status: paid >= 20000 ? 'PAID' : 'PENDING',
  });
  const invoices = await M.FeeInvoice.insertMany([
    inv(1, 'Term 1 (Apr–Jul)', new Date('2026-04-01'), new Date('2026-07-31'), new Date('2026-04-15'), 20000),
    inv(2, 'Term 2 (Aug–Nov)', new Date('2026-08-01'), new Date('2026-11-30'), daysFromToday(10), 0),
    inv(3, 'Term 3 (Dec–Mar)', new Date('2026-12-01'), new Date('2027-03-31'), new Date('2026-12-15'), 0),
    inv(4, 'Term 1 (Apr–Jul)', new Date('2026-04-01'), new Date('2026-07-31'), new Date('2026-04-15'), 20000, siblingStudent),
    inv(5, 'Term 2 (Aug–Nov)', new Date('2026-08-01'), new Date('2026-11-30'), daysFromToday(10), 8000, siblingStudent),
  ]);
  invoices[4].status = 'PARTIALLY_PAID';
  await invoices[4].save();
  // The payments behind the paid amounts — these are what the Parent app lists as receipts.
  const pay = (invoice, n, amount, date, method, reference) => ({
    schoolId: S, invoiceId: invoice._id, studentId: invoice.studentId, receiptNumber: `RCP-DEMO-${n}`, amount,
    paymentMethod: method, paymentMode: method, paymentReference: reference, referenceNo: reference,
    paymentDate: date, transactionDate: date, status: 'COMPLETED', remarks: 'Demo payment',
  });
  await M.FeePayment.insertMany([
    pay(invoices[0], 1, 12000, new Date('2026-04-10T10:15:00'), 'UPI', 'UPI-DEMO-481516'),
    pay(invoices[0], 2, 8000, new Date('2026-04-14T16:40:00'), 'CASH', ''),
    pay(invoices[3], 3, 20000, new Date('2026-04-12T11:05:00'), 'UPI', 'UPI-DEMO-234223'),
    pay(invoices[4], 4, 8000, daysFromToday(-20, 12), 'BANK_TRANSFER', 'NEFT-DEMO-90210'),
  ]);

  // ---- safe pickup history (read-only for the parent): three completed, one expired
  const pickup = (back, status, extra = () => ({})) => {
    const at = daysFromToday(-back, 13);
    return {
      schoolId: S, studentId: demoStudent._id, studentName: 'Aarav Mehta', classId: tenA.cls._id, className: tenA.cls.name,
      sectionId: tenA.doc._id, sectionName: tenA.name, teacherId: demoTeacher._id, teacherName: demoTeacher.name,
      guardianName: 'Rajiv Mehta', guardianMobile: parent.phone, status, initiatedAt: at, initiatedBy: demoTeacher._id,
      lastOtpSentAt: at, otpExpiresAt: new Date(at.getTime() + 5 * 60000), ...extra(at),
    };
  };
  const done = (person, relationship) => (at) => ({
    verifiedAt: new Date(at.getTime() + 2 * 60000), completedAt: new Date(at.getTime() + 4 * 60000),
    verifiedBy: demoTeacher._id, completedBy: demoTeacher._id, pickupPersonName: person, pickupPersonRelationship: relationship, handoverConfirmed: true,
  });
  await M.StudentPickupSession.insertMany([
    pickup(3, 'COMPLETED', done('Rajiv Mehta', 'Parent')),
    pickup(11, 'EXPIRED', (at) => ({ expiredAt: new Date(at.getTime() + 5 * 60000) })),
    pickup(17, 'COMPLETED', done('Sunita Mehta', 'Relative')),
    pickup(31, 'COMPLETED', done('Rajiv Mehta', 'Parent')),
  ]);

  // ---- notifications (targeted, so the empty-state accounts stay empty); some already read
  const notify = async (role, userId, rows, readCount, userType) => {
    const docs = await M.PlatformNotification.insertMany(
      rows.map(([title, body, type, id]) => ({
        title, body, audiences: [role], recipientRefIds: [String(userId)], schoolId: DEMO_SCHOOL_SLUG, schoolName: school.name,
        createdBy: 'app-demo-seed', link: { type: type || '', id: id ? String(id) : '' },
      })),
    );
    // Newest first in the inbox: row 0 = most recent. Back-date with the raw driver
    // (Mongoose timestamps would overwrite createdAt).
    await M.PlatformNotification.collection.bulkWrite(
      docs.map((d, i) => ({ updateOne: { filter: { _id: d._id }, update: { $set: { createdAt: new Date(now - (i * 26 + 1) * 3600000) } } } })),
    );
    await M.ReadReceipt.insertMany(
      docs.slice(rows.length - readCount).map((d) => ({
        schoolId: S, userId: String(userId), userType, refType: 'NOTIFICATION', refId: String(d._id), readAt: now,
      })),
    );
  };
  const aaravHw = hwDocs.filter((h) => String(h.sectionId) === String(tenA.doc._id)).sort((a, b) => b.assignedDate - a.assignedDate);
  const aaravAs = asDocs.filter((a) => String(a.sectionId) === String(tenA.doc._id));
  await notify('student', demoStudent._id, [
    ['New homework: Mathematics', `${aaravHw[0].title} — due ${aaravHw[0].dueDate.toDateString()}`, 'homework', aaravHw[0]._id],
    ['Fee reminder', 'Term 2 fee of ₹20,000 is due in 10 days.', '', ''],
    ['New assignment: Computer Science', 'Build a quiz app in Python — due in 12 days.', 'assignment', aaravAs.find((a) => a.subjectName === 'Computer Science')?._id],
    ['Unit Test 2 date sheet', 'Unit Test 2 starts in 12 days. Check the Exams section.', 'notice', ''],
    ['Homework graded', 'Your English homework was checked: 9/10.', 'homework', aaravHw[3]?._id],
    ['New homework: Science', `${aaravHw[1].title}`, 'homework', aaravHw[1]._id],
    ['PTM on Saturday', 'Please remind your parents about the Parent–Teacher Meeting.', 'notice', ''],
    ['Attendance: marked late', 'You were marked LATE today in Class 10 - A.', 'attendance', ''],
    ['Assignment graded', 'Project: Statistics of our class heights — 17/20.', 'assignment', aaravAs[0]?._id],
    ['Result published: Unit Test 1', 'Your Unit Test 1 result is now available.', 'result', ut1._id],
    ['Library books due', 'Return borrowed books before the holidays.', '', ''],
    ['New homework: Hindi', `${aaravHw[4]?.title || 'Hindi worksheet'}`, 'homework', aaravHw[4]?._id],
    ['Science exhibition', 'Register your project with your class teacher by Friday.', 'notice', ''],
    ['Welcome to the new session', 'Your timetable for 2026-27 is ready.', '', ''],
  ], 8, 'STUDENT');
  await notify('teacher', demoTeacher._id, [
    ['Marks pending: Half Yearly', 'Enter Mathematics marks for Class 9 - B and Class 10 - B.', '', ''],
    ['Leave request received', 'Aarav Mehta (10-A) applied for leave on a future date.', 'leave', ''],
    ['Staff meeting today', 'Syllabus review in the staff room at 1:15 PM.', 'notice', ''],
    ['12 new submissions', 'Trigonometry applications — Class 10 - A.', 'assignment', asDocs.find((a) => a.title.startsWith('Trigonometry') && String(a.sectionId) === String(tenA.doc._id))?._id],
    ['Your leave was approved', 'Casual leave (1 day) approved by the principal.', 'leave', ''],
    ['Submit lesson plans', 'Upload next week’s lesson plans by Friday evening.', 'notice', ''],
    ['Attendance reminder', 'Attendance for Class 10 - A is not marked yet today.', 'attendance', ''],
    ['Timetable updated', 'Your Saturday periods have changed from this week.', '', ''],
    ['Exam duty assigned', 'You are the invigilator for Unit Test 2 — Mathematics.', '', ''],
    ['Welcome to the new session', 'Your classes for 2026-27 are ready in the app.', '', ''],
  ], 5, 'TEACHER');
  await notify('parent', parent._id, [
    ['Fee reminder', 'Term 2 fee of ₹20,000 for Aarav is due in 10 days.', 'fee', ''],
    ['Aarav was marked late', 'Aarav was marked LATE in Class 10 - A.', 'attendance', ''],
    ['Pickup completed', 'Aarav was handed over to Rajiv Mehta at the school gate.', 'pickup', ''],
    ['New homework for Aarav', `Mathematics: ${aaravHw[0].title}`, 'homework', aaravHw[0]._id],
    ['Fee reminder', 'Term 2 balance of ₹12,000 for Anaya is due in 10 days.', 'fee', ''],
    ['Result published', 'Aarav’s Unit Test 1 result is available.', 'result', ut1._id],
    ['PTM on Saturday', '9:00 AM – 12:00 PM. Please meet the class teachers.', 'notice', ''],
    ['Payment received', '₹8,000 received for Anaya — Term 2. Receipt RCP-DEMO-4.', 'payment', ''],
    ['Unit Test 2 date sheet', 'Unit Test 2 starts in 12 days for Classes 9 and 10.', 'exam', ''],
    ['Welcome to the Parent app', 'Track attendance, homework, results and fees for your children.', '', ''],
  ], 5, 'PARENT');

  return {
    students: [...roster.values()].reduce((a, l) => a + l.length, 0),
    attendanceDays: attendance.length / active.length,
    homework: hwDocs.length,
    homeworkSubmissions: hwSubs.length,
    assignments: asDocs.length,
    assignmentSubmissions: asSubs.length,
    examMarks: marks.length,
    results: results.length,
    timetable: timetable.length,
    transportRiders,
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  await mongoose.connect(env.mongoUri);
  const M = await loadAllModels();
  try {
    if (args.has('--remove') || args.has('--reset')) {
      const removed = await removeDemoSchool(M);
      if (!removed) console.log('No demo school to remove.');
      if (args.has('--remove')) return;
    } else if (await M.School.exists({ schoolId: DEMO_SCHOOL_SLUG })) {
      console.log('Demo school already exists. Use --reset to recreate it or --remove to delete it.');
      return;
    }
    // A database that ran the old transport module would refuse the second demo route.
    await dropLegacyTransportIndexes();
    const started = Date.now();
    const stats = await seed(M);
    console.log(`Demo school created in ${((Date.now() - started) / 1000).toFixed(1)}s`, stats);
    console.log(`Password logins (${PASSWORD}): admin@app-demo.example.com (admin panel), teacher.demo@example.com, transport.demo@example.com, teacher.empty@example.com`);
    console.log('Mobile + OTP logins (the OTP is printed in the platform-service log): student 9000022222, parent 9000011111, student (empty) 9000033333');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  console.error('Demo seed failed:', process.env.SEED_DEBUG ? err.stack : err.message);
  process.exitCode = 1;
});
