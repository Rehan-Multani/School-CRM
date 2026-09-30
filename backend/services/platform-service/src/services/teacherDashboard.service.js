import mongoose from 'mongoose';
import { TimetableEntry, TIMETABLE_DAYS } from '../models/TimetableEntry.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { Homework } from '../models/Homework.js';
import { Exam } from '../models/Exam.js';
import { ExamMarks } from '../models/ExamMarks.js';
import { ExamSubject } from '../models/ExamSubject.js';
import { periodLite } from '../serializers/teacher.serializers.js';
import { todayDayCode } from './teacherTimetable.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const oids = (arr) => [...arr].map(oid);
const nowHM = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function nextSchoolDays(fromCode) {
  const start = fromCode ? TIMETABLE_DAYS.indexOf(fromCode) : 0;
  const order = [];
  for (let i = 0; i < TIMETABLE_DAYS.length; i += 1) {
    order.push(TIMETABLE_DAYS[(start + i) % TIMETABLE_DAYS.length]);
  }
  return order;
}

class TeacherDashboardService {
  async dashboard(ctx) {
    const school = oid(ctx.schoolId);
    const teacher = oid(ctx.teacherId);
    const dayCode = todayDayCode();
    const sectionIds = oids(ctx.sectionIds);
    const classIds = oids(ctx.classIds);

    const [classesToday, studentCount, pendingHomework, week, pendingMarks] = await Promise.all([
      dayCode
        ? TimetableEntry.countDocuments({ schoolId: school, teacherId: teacher, dayOfWeek: dayCode, status: 'ACTIVE' })
        : 0,
      StudentEnrollment.countDocuments({ schoolId: school, sectionId: { $in: sectionIds }, status: 'ACTIVE' }),
      Homework.countDocuments({ schoolId: school, teacherId: teacher, status: 'ASSIGNED' }),
      TimetableEntry.find({ schoolId: school, teacherId: teacher, status: 'ACTIVE' })
        .sort({ dayOfWeek: 1, periodNumber: 1 })
        .lean(),
      // A stat tile must never fail the whole dashboard.
      this.#pendingMarks(school, ctx).catch(() => 0),
    ]);

    // nextClass: next period today after now, else first period of the next school day.
    let nextClass = null;
    if (week.length) {
      const hm = nowHM();
      const dayList = nextSchoolDays(dayCode || 'MON');
      for (let di = 0; di < dayList.length && !nextClass; di += 1) {
        const d = dayList[di];
        const periods = week
          .filter((p) => p.dayOfWeek === d)
          .sort((a, b) => a.periodNumber - b.periodNumber);
        for (const p of periods) {
          if (di === 0 && d === dayCode && p.startTime <= hm) continue;
          nextClass = periodLite(p);
          break;
        }
      }
    }

    return {
      stats: {
        classesToday,
        students: studentCount,
        pendingHomework,
        pendingMarks,
      },
      nextClass,
    };
  }

  async todaySchedule(ctx) {
    const dayCode = todayDayCode();
    if (!dayCode) return { day: null, periods: [] };
    const rows = await TimetableEntry.find({
      schoolId: oid(ctx.schoolId),
      teacherId: oid(ctx.teacherId),
      dayOfWeek: dayCode,
      status: 'ACTIVE',
    })
      .sort({ periodNumber: 1 })
      .lean();
    return { day: dayCode, periods: rows.map(periodLite) };
  }

  /**
   * (exam × section × subject) slots this teacher must enter marks for that
   * have no marks yet. A slot is what the marks screen offers: an ExamSubject
   * (class + subject) the teacher teaches, in each section of that class where
   * they teach it. Three queries total, however many exams/sections exist.
   */
  async #pendingMarks(school, ctx) {
    if (!ctx.currentYearId || !ctx.sectionSubjectPairs.size) return 0;
    // Only exams the marks screen still accepts (teacherExam LOCKED_EXAM_STATUS
    // rejects COMPLETED/PUBLISHED) and that have started — a future exam has
    // no marks to enter yet.
    const exams = await Exam.find({
      schoolId: school,
      academicYearId: oid(ctx.currentYearId),
      status: { $in: ['SCHEDULED', 'IN_PROGRESS'] },
      startDate: { $lte: new Date() },
      classIds: { $in: oids(ctx.classIds) },
    })
      .select('_id')
      .lean();
    if (!exams.length) return 0;
    const examIds = exams.map((e) => e._id);

    const [examSubjects, marked] = await Promise.all([
      ExamSubject.find({ schoolId: school, examId: { $in: examIds } }).select('examId classId subjectId').lean(),
      ExamMarks.aggregate([
        { $match: { schoolId: school, examId: { $in: examIds }, sectionId: { $in: oids(ctx.sectionIds) } } },
        { $group: { _id: { examId: '$examId', sectionId: '$sectionId', subjectId: '$subjectId' } } },
      ]),
    ]);
    const done = new Set(marked.map(({ _id: k }) => `${k.examId}:${k.sectionId}:${k.subjectId}`));

    let pending = 0;
    for (const es of examSubjects) {
      if (!ctx.classSubjectPairs.has(`${es.classId}:${es.subjectId}`)) continue;
      for (const pair of ctx.sectionSubjectPairs) {
        const [sectionId, subjectId] = pair.split(':');
        if (subjectId !== String(es.subjectId) || ctx.sectionClassIds.get(sectionId) !== String(es.classId)) continue;
        if (!done.has(`${es.examId}:${sectionId}:${subjectId}`)) pending += 1;
      }
    }
    return pending;
  }
}

export const teacherDashboardService = new TeacherDashboardService();
