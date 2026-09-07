import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { StudentAttendance, STUDENT_ATTENDANCE_STATUSES } from '../models/StudentAttendance.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

function emptyTally() {
  const t = {};
  for (const s of STUDENT_ATTENDANCE_STATUSES) t[s] = 0;
  return t;
}

function summarise(rows) {
  const tally = emptyTally();
  for (const r of rows) tally[r.status] = (tally[r.status] || 0) + 1;
  const total = rows.length;
  const present = tally.PRESENT + tally.LATE + tally.HALF_DAY;
  return {
    ...tally,
    total,
    presentPercentage: total ? Math.round((present / total) * 100) : 0,
  };
}

class StudentSelfAttendanceService {
  /** All of THIS student's own attendance entries, optionally within [from,to]. */
  async #entries(ctx, { from, to } = {}) {
    const match = { schoolId: oid(ctx.schoolId), sectionId: oid(ctx.sectionId) };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = from;
      if (to) match.date.$lte = to;
    }
    const rows = await StudentAttendance.aggregate([
      { $match: match },
      { $unwind: '$entries' },
      { $match: { 'entries.studentId': oid(ctx.studentId) } },
      {
        $project: {
          _id: 0,
          date: '$date',
          status: '$entries.status',
          note: '$entries.note',
          sectionName: '$sectionName',
          className: '$className',
        },
      },
      { $sort: { date: 1 } },
    ]);
    return rows;
  }

  async summary(ctx) {
    const rows = await this.#entries(ctx);
    const monthMap = new Map();
    for (const r of rows) {
      const m = r.date.slice(0, 7);
      if (!monthMap.has(m)) monthMap.set(m, []);
      monthMap.get(m).push(r);
    }
    return {
      overall: summarise(rows),
      firstRecordedDate: rows[0]?.date || null,
      lastRecordedDate: rows[rows.length - 1]?.date || null,
      byMonth: [...monthMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, mrows]) => ({ month, ...summarise(mrows) })),
    };
  }

  async daily(ctx, query = {}) {
    const from = String(query.from || '').trim();
    const to = String(query.to || '').trim();
    if (from && !ISO_DATE.test(from)) throw new AppError('from must be YYYY-MM-DD', 400, STUDENT_ERR.VALIDATION_ERROR);
    if (to && !ISO_DATE.test(to)) throw new AppError('to must be YYYY-MM-DD', 400, STUDENT_ERR.VALIDATION_ERROR);
    const rows = await this.#entries(ctx, { from: from || undefined, to: to || undefined });
    return {
      from: from || rows[0]?.date || null,
      to: to || rows[rows.length - 1]?.date || null,
      days: rows.map((r) => ({ date: r.date, status: r.status, note: r.note || '' })),
      summary: summarise(rows),
    };
  }

  async monthly(ctx, query = {}) {
    const month = String(query.month || '').trim();
    if (!ISO_MONTH.test(month)) throw new AppError('month must be YYYY-MM', 400, STUDENT_ERR.VALIDATION_ERROR);
    const from = `${month}-01`;
    const to = `${month}-31`;
    const rows = await this.#entries(ctx, { from, to });
    return {
      month,
      days: rows.map((r) => ({ date: r.date, status: r.status, note: r.note || '' })),
      summary: summarise(rows),
    };
  }
}

export const studentSelfAttendanceService = new StudentSelfAttendanceService();
