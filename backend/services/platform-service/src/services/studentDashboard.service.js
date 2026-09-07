import mongoose from 'mongoose';
import { Homework } from '../models/Homework.js';
import { HomeworkSubmission } from '../models/HomeworkSubmission.js';
import { Exam } from '../models/Exam.js';
import { Event } from '../models/Event.js';
import { Announcement } from '../models/Communication.js';
import { studentSelfAttendanceService } from './studentSelfAttendance.service.js';
import { studentTimetableService, todayDayCode } from './studentTimetable.service.js';
import { examLite, noticeLite, eventLite, homeworkLite, periodLite } from '../serializers/student.serializers.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const SUBMITTED = new Set(['SUBMITTED', 'LATE', 'GRADED']);
const DAY_MS = 86400000;

class StudentDashboardService {
  async #pendingHomework(ctx) {
    const hw = await Homework.find({ schoolId: oid(ctx.schoolId), sectionId: oid(ctx.sectionId), status: 'ASSIGNED' })
      .select('_id dueDate title subjectName assignedDate status')
      .lean();
    if (!hw.length) return { count: 0, items: [] };
    const subs = await HomeworkSubmission.find({
      schoolId: oid(ctx.schoolId),
      studentId: oid(ctx.studentId),
      homeworkId: { $in: hw.map((h) => h._id) },
    })
      .select('homeworkId status')
      .lean();
    const done = new Set(subs.filter((s) => SUBMITTED.has(s.status)).map((s) => String(s.homeworkId)));
    const pending = hw.filter((h) => !done.has(String(h._id)));
    return { count: pending.length, items: pending };
  }

  async #nextClass(ctx) {
    const today = await studentTimetableService.today(ctx).catch(() => null);
    const hm = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    if (today?.periods?.length) {
      const upcoming = today.periods.find((p) => p.startTime > hm);
      if (upcoming) return upcoming;
    }
    // else first period of the next school day that has any entries
    const week = await studentTimetableService.week(ctx).catch(() => null);
    if (!week) return null;
    const order = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const startIdx = order.indexOf(todayDayCode() || 'MON');
    for (let i = 1; i <= order.length; i += 1) {
      const day = order[(startIdx + i) % order.length];
      const periods = week.timetable[day] || [];
      if (periods.length) return periods[0];
    }
    return null;
  }

  async dashboard(ctx) {
    const [attendance, pending, nextClass, exams, announcements] = await Promise.all([
      studentSelfAttendanceService.summary(ctx).catch(() => ({ overall: { presentPercentage: 0 } })),
      this.#pendingHomework(ctx),
      this.#nextClass(ctx),
      ctx.classId
        ? Exam.find({
            schoolId: oid(ctx.schoolId),
            classIds: oid(ctx.classId),
            status: { $in: ['SCHEDULED', 'IN_PROGRESS'] },
            endDate: { $gte: new Date() },
          })
            .sort({ startDate: 1 })
            .limit(3)
            .lean()
        : [],
      Announcement.find({
        schoolId: oid(ctx.schoolId),
        status: 'PUBLISHED',
        audiences: { $in: ['ALL', 'STUDENTS'] },
      })
        .sort({ pinned: -1, createdAt: -1 })
        .limit(3)
        .lean(),
    ]);

    const soonHw = [...pending.items]
      .filter((h) => h.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 3);

    return {
      student: {
        name: [ctx.student?.firstName, ctx.student?.lastName].filter(Boolean).join(' ').trim(),
        className: ctx.className,
        sectionName: ctx.sectionName,
        rollNumber: ctx.rollNumber,
        photo: ctx.student?.photo || '',
      },
      todaySummary: {
        attendancePercentage: attendance.overall?.presentPercentage ?? 0,
        pendingHomework: pending.count,
        nextClass: nextClass || null,
      },
      upcoming: {
        exams: exams.map((e) => examLite(e)),
        homework: soonHw.map((h) => homeworkLite(h, null)),
        events: [],
      },
      announcements: announcements.map((a) => noticeLite(a)),
    };
  }

  async today(ctx) {
    const [tt, pending] = await Promise.all([
      studentTimetableService.today(ctx),
      this.#pendingHomework(ctx),
    ]);
    const todayStr = new Date().toISOString().slice(0, 10);
    const dueToday = pending.items.filter((h) => h.dueDate && new Date(h.dueDate).toISOString().slice(0, 10) === todayStr);
    return {
      day: tt.day,
      periods: tt.periods,
      currentPeriodId: tt.currentPeriodId,
      homeworkDueToday: dueToday.map((h) => homeworkLite(h, null)),
    };
  }

  async upcoming(ctx) {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * DAY_MS);
    const [exams, events, pending, announcements] = await Promise.all([
      ctx.classId
        ? Exam.find({
            schoolId: oid(ctx.schoolId),
            classIds: oid(ctx.classId),
            status: { $in: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PUBLISHED'] },
            endDate: { $gte: now },
          })
            .sort({ startDate: 1 })
            .limit(5)
            .lean()
        : [],
      Event.find({ schoolId: oid(ctx.schoolId), audiences: { $in: ['ALL', 'STUDENTS'] }, endAt: { $gte: now } })
        .sort({ startAt: 1 })
        .limit(5),
      this.#pendingHomework(ctx),
      Announcement.find({ schoolId: oid(ctx.schoolId), status: 'PUBLISHED', audiences: { $in: ['ALL', 'STUDENTS'] } })
        .sort({ pinned: -1, createdAt: -1 })
        .limit(5)
        .lean(),
    ]);
    const soonHw = pending.items
      .filter((h) => h.dueDate && new Date(h.dueDate) <= in7)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return {
      exams: exams.map((e) => examLite(e)),
      events: events.map((e) => eventLite(e.toPublicJSON())),
      homework: soonHw.map((h) => homeworkLite(h, null)),
      announcements: announcements.map((a) => noticeLite(a)),
    };
  }
}

export const studentDashboardService = new StudentDashboardService();
