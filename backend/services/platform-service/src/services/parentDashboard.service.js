import { School } from '../models/School.js';
import { studentSelfAttendanceService } from './studentSelfAttendance.service.js';
import { studentHomeworkService } from './studentHomework.service.js';
import { studentTimetableService } from './studentTimetable.service.js';
import { studentExamService } from './studentExam.service.js';
import { studentFeeService } from './studentFee.service.js';
import { parentInboxService } from './parentInbox.service.js';
import { childCard } from '../serializers/parent.serializers.js';

// No per-school attendance-threshold field exists yet — documented default.
// `School.settings.lowAttendanceThreshold` is honoured if a school later adds it.
const DEFAULT_LOW_ATTENDANCE = 75;

async function lowAttendanceThreshold(schoolId) {
  const school = await School.findById(schoolId).select('settings').lean();
  const t = Number(school?.settings?.lowAttendanceThreshold);
  return Number.isFinite(t) && t > 0 && t <= 100 ? t : DEFAULT_LOW_ATTENDANCE;
}

async function childSummary(childCtx) {
  const [attn, pendingHw, fees] = await Promise.all([
    studentSelfAttendanceService.summary(childCtx).catch(() => ({ overall: { presentPercentage: 0, total: 0 } })),
    studentHomeworkService.pending(childCtx, { limit: 1 }).catch(() => ({ pagination: { total: 0 } })),
    studentFeeService.summary(childCtx).catch(() => ({ pending: 0, nextDueDate: null })),
  ]);
  return {
    attendancePercentage: attn.overall?.presentPercentage ?? 0,
    attendanceRecorded: attn.overall?.total ?? 0,
    pendingHomework: pendingHw.pagination?.total ?? 0,
    pendingFees: fees.pending ?? 0,
    nextFeeDueDate: fees.nextDueDate ?? null,
  };
}

class ParentDashboardService {
  /** Home tab for the currently-selected child. */
  async dashboard(parentCtx, childCtx, childRow) {
    const [summary, todayTt, exams, notices, threshold] = await Promise.all([
      childSummary(childCtx),
      studentTimetableService.today(childCtx).catch(() => ({ periods: [], currentPeriodId: null, day: null })),
      studentExamService.upcomingExams(childCtx).catch(() => []),
      parentInboxService.notices(parentCtx, { limit: 5 }).catch(() => ({ data: [] })),
      lowAttendanceThreshold(parentCtx.schoolId),
    ]);

    const hm = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const nextClass = (todayTt.periods || []).find((p) => p.startTime > hm) || null;

    return {
      child: childCard(childRow.student, childRow.link, childRow),
      todaySummary: {
        attendancePercentage: summary.attendancePercentage,
        pendingHomework: summary.pendingHomework,
        nextClass,
      },
      pendingFees: {
        amount: summary.pendingFees,
        nextDueDate: summary.nextFeeDueDate,
      },
      upcomingExams: exams,
      recentNotices: notices.data || [],
      alerts: {
        lowAttendance:
          summary.attendanceRecorded > 0 && summary.attendancePercentage < threshold
            ? { threshold, current: summary.attendancePercentage }
            : null,
      },
    };
  }

  /** Child-selector roll-up — one light row per linked child. */
  async overview(parentCtx, resolveChild) {
    const rows = await Promise.all(
      parentCtx.children.map(async (row) => {
        try {
          const childCtx = await resolveChild(row.studentId);
          const s = await childSummary(childCtx);
          return {
            childId: row.studentId,
            name: row.name,
            photo: row.photo,
            className: row.className,
            sectionName: row.sectionName,
            attendancePercentage: s.attendancePercentage,
            pendingHomework: s.pendingHomework,
            pendingFees: s.pendingFees,
          };
        } catch {
          return {
            childId: row.studentId,
            name: row.name,
            photo: row.photo,
            className: row.className,
            sectionName: row.sectionName,
            attendancePercentage: 0,
            pendingHomework: 0,
            pendingFees: 0,
          };
        }
      })
    );
    return { children: rows };
  }
}

export const parentDashboardService = new ParentDashboardService();
