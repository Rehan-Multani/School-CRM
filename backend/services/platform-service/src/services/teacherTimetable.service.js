import { AppError } from '../../../shared/AppError.js';
import { teacherTimetableRepository, TIMETABLE_DAYS } from '../repositories/teacherTimetable.repository.js';
import { periodLite } from '../serializers/teacher.serializers.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

// JS Date.getDay(): 0=Sun..6=Sat  →  timetable day code (Sun => null)
export function todayDayCode(d = new Date()) {
  return [null, 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
}

class TeacherTimetableService {
  async week(ctx) {
    const rows = await teacherTimetableRepository.weekForTeacher(ctx.schoolId, ctx.teacherId);
    const byDay = Object.fromEntries(TIMETABLE_DAYS.map((d) => [d, []]));
    for (const r of rows) (byDay[r.dayOfWeek] ||= []).push(periodLite(r));
    return { days: TIMETABLE_DAYS, timetable: byDay };
  }

  async day(ctx, dayParam) {
    const day = String(dayParam || '').toUpperCase().slice(0, 3);
    if (!TIMETABLE_DAYS.includes(day)) {
      throw new AppError(`day must be one of ${TIMETABLE_DAYS.join(', ')}`, 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    const rows = await teacherTimetableRepository.dayForTeacher(ctx.schoolId, ctx.teacherId, day);
    return { day, periods: rows.map(periodLite) };
  }

  async entry(ctx, id) {
    const doc = await teacherTimetableRepository.entryById(ctx.schoolId, id);
    if (!doc || String(doc.teacherId) !== String(ctx.teacherId)) {
      throw new AppError('Schedule entry not found', 404, TEACHER_ERR.NOT_FOUND);
    }
    return periodLite(doc);
  }
}

export const teacherTimetableService = new TeacherTimetableService();
