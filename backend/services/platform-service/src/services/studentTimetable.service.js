import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { TimetableEntry, TIMETABLE_DAYS } from '../models/TimetableEntry.js';
import { periodLite } from '../serializers/student.serializers.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

// JS Date.getDay(): 0=Sun..6=Sat → timetable day code (Sun => null, no school)
export function todayDayCode(d = new Date()) {
  return [null, 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
}

class StudentTimetableService {
  #filter(ctx) {
    return { schoolId: oid(ctx.schoolId), sectionId: oid(ctx.sectionId), status: 'ACTIVE' };
  }

  async week(ctx) {
    const rows = await TimetableEntry.find(this.#filter(ctx))
      .sort({ dayOfWeek: 1, periodNumber: 1 })
      .lean();
    const byDay = Object.fromEntries(TIMETABLE_DAYS.map((d) => [d, []]));
    for (const r of rows) (byDay[r.dayOfWeek] ||= []).push(periodLite(r));
    return { days: TIMETABLE_DAYS, timetable: byDay };
  }

  async day(ctx, dayParam) {
    const day = String(dayParam || '').toUpperCase().slice(0, 3);
    if (!TIMETABLE_DAYS.includes(day)) {
      throw new AppError(`day must be one of ${TIMETABLE_DAYS.join(', ')}`, 400, STUDENT_ERR.VALIDATION_ERROR);
    }
    const rows = await TimetableEntry.find({ ...this.#filter(ctx), dayOfWeek: day })
      .sort({ periodNumber: 1 })
      .lean();
    return { day, periods: rows.map(periodLite) };
  }

  async today(ctx) {
    const day = todayDayCode();
    if (!day) return { day: null, periods: [], currentPeriodId: null };
    const rows = await TimetableEntry.find({ ...this.#filter(ctx), dayOfWeek: day })
      .sort({ periodNumber: 1 })
      .lean();
    const hm = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const current = rows.find((p) => p.startTime <= hm && hm < p.endTime);
    return {
      day,
      periods: rows.map(periodLite),
      currentPeriodId: current ? String(current._id) : null,
    };
  }
}

export const studentTimetableService = new StudentTimetableService();
