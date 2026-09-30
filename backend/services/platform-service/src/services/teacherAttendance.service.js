import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { StudentAttendance, STUDENT_ATTENDANCE_STATUSES } from '../models/StudentAttendance.js';
import { studentAttendanceRepository } from '../repositories/studentAttendance.repository.js';
import { studentAttendanceService, validDate, todayStr } from './studentAttendance.service.js';
import { teacherAccessService } from './teacherAccess.service.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';
import { pushEvents } from './pushEvents.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const oids = (arr) => [...arr].map(oid);

function pickStatus(v) {
  const up = String(v || '').toUpperCase();
  if (!STUDENT_ATTENDANCE_STATUSES.includes(up)) {
    throw new AppError(
      `status must be one of ${STUDENT_ATTENDANCE_STATUSES.join(', ')}`,
      400,
      TEACHER_ERR.INVALID_ATTENDANCE_STATUS
    );
  }
  return up;
}

class TeacherAttendanceService {
  async today(ctx, sectionId) {
    return this.forDate(ctx, sectionId, todayStr());
  }

  /**
   * The mark sheet + the stored day's id/lock state — the app needs
   * `attendanceId` to PATCH/finalize and `locked` to render read-only.
   */
  async forDate(ctx, sectionId, date) {
    teacherAccessService.assertSection(ctx, sectionId);
    const day = validDate(date);
    const [sheet, existing] = await Promise.all([
      studentAttendanceService.getDay(ctx.schoolId, sectionId, day),
      studentAttendanceRepository.findDay(ctx.schoolId, sectionId, day),
    ]);
    return {
      ...sheet,
      attendanceId: existing ? String(existing._id) : null,
      locked: Boolean(existing?.locked),
      isClassTeacher: teacherAccessService.isClassTeacherOf(ctx, sectionId),
    };
  }

  /**
   * Bulk submit for a section+date. Idempotent at the storage layer (unique
   * {schoolId,sectionId,date} upsert) AND via the optional Idempotency-Key
   * middleware. Rejects: locked day, unknown/duplicate students, bad status.
   */
  async submit(ctx, payload = {}, actorName = '') {
    const sectionId = payload.sectionId;
    teacherAccessService.assertSection(ctx, sectionId);
    const day = validDate(payload.date);

    const meta = await studentAttendanceRepository.sectionMeta(ctx.schoolId, sectionId);
    if (!meta) throw new AppError('Section not found', 404, TEACHER_ERR.SECTION_ACCESS_DENIED);

    const existing = await studentAttendanceRepository.findDay(ctx.schoolId, sectionId, day);
    if (existing?.locked) {
      throw new AppError('Attendance for this day has been finalized and cannot be changed', 409, TEACHER_ERR.ATTENDANCE_FINALIZED);
    }

    const roster = await studentAttendanceRepository.roster(ctx.schoolId, sectionId);
    if (!roster.length) {
      throw new AppError('This section has no active students to mark', 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    const rosterById = new Map(roster.map((r) => [String(r.studentId), r]));

    const records = Array.isArray(payload.records) ? payload.records : [];
    if (!records.length) throw new AppError('records[] is required', 400, TEACHER_ERR.VALIDATION_ERROR);

    const seen = new Set();
    const incoming = new Map();
    for (const rec of records) {
      const sid = String(rec?.studentId || '');
      if (!sid || !mongoose.isValidObjectId(sid)) {
        throw new AppError('Every record needs a valid studentId', 400, TEACHER_ERR.VALIDATION_ERROR);
      }
      if (seen.has(sid)) {
        throw new AppError(`Duplicate studentId in payload: ${sid}`, 400, TEACHER_ERR.VALIDATION_ERROR);
      }
      seen.add(sid);
      if (!rosterById.has(sid)) {
        throw new AppError('One or more students are not in this section', 403, TEACHER_ERR.STUDENT_ACCESS_DENIED);
      }
      incoming.set(sid, { status: pickStatus(rec.status), note: String(rec.note || '').trim() });
    }

    // Full-roster entries; unmarked students default to PRESENT (matches the
    // principal flow) but preserve any previously stored status on a partial edit.
    const prev = new Map((existing?.entries || []).map((e) => [String(e.studentId), e]));
    const entries = roster.map((r) => {
      const sid = String(r.studentId);
      const inc = incoming.get(sid);
      const before = prev.get(sid);
      return {
        studentId: r.studentId,
        studentName: r.studentName,
        rollNumber: r.rollNumber,
        status: inc ? inc.status : before?.status || 'PRESENT',
        note: inc ? inc.note : before?.note || '',
      };
    });

    const doc = await studentAttendanceRepository.upsertDay(ctx.schoolId, sectionId, day, {
      academicYearId: meta.academicYearId,
      classId: meta.classId,
      className: meta.className,
      sectionName: meta.sectionName,
      entries,
      markedByName: actorName,
      markedById: oid(ctx.teacherId),
    });
    const flagged = entries.filter(
      (e) => ['ABSENT', 'LATE'].includes(e.status) && prev.get(String(e.studentId))?.status !== e.status
    );
    if (flagged.length) pushEvents.attendanceFlagged(ctx.schoolId, day, flagged).catch(() => {});
    return doc.toPublicJSON();
  }

  async patchDay(ctx, attendanceId, payload = {}, actorName = '') {
    const doc = await StudentAttendance.findOne({ schoolId: oid(ctx.schoolId), _id: oid(attendanceId) });
    if (!doc) throw new AppError('Attendance record not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertSection(ctx, doc.sectionId);
    if (doc.locked) {
      throw new AppError('Attendance for this day has been finalized and cannot be changed', 409, TEACHER_ERR.ATTENDANCE_FINALIZED);
    }
    const records = Array.isArray(payload.records) ? payload.records : [];
    if (!records.length) throw new AppError('records[] is required', 400, TEACHER_ERR.VALIDATION_ERROR);
    const byId = new Map(doc.entries.map((e) => [String(e.studentId), e]));
    const flagged = [];
    for (const rec of records) {
      const sid = String(rec?.studentId || '');
      const entry = byId.get(sid);
      if (!entry) throw new AppError('One or more students are not in this attendance sheet', 403, TEACHER_ERR.STUDENT_ACCESS_DENIED);
      const nextStatus = pickStatus(rec.status);
      if (['ABSENT', 'LATE'].includes(nextStatus) && entry.status !== nextStatus) flagged.push({ studentId: sid, status: nextStatus });
      entry.status = nextStatus;
      if (rec.note !== undefined) entry.note = String(rec.note || '').trim();
    }
    doc.markedByName = actorName || doc.markedByName;
    doc.markedById = oid(ctx.teacherId);
    await doc.save();
    if (flagged.length) pushEvents.attendanceFlagged(ctx.schoolId, doc.date, flagged).catch(() => {});
    return doc.toPublicJSON();
  }

  async finalize(ctx, attendanceId) {
    const doc = await StudentAttendance.findOne({ schoolId: oid(ctx.schoolId), _id: oid(attendanceId) });
    if (!doc) throw new AppError('Attendance record not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertSection(ctx, doc.sectionId);
    if (doc.locked) return doc.toPublicJSON();
    doc.locked = true;
    doc.lockedAt = new Date();
    doc.markedById = oid(ctx.teacherId);
    await doc.save();
    return doc.toPublicJSON();
  }

  async history(ctx, query = {}) {
    const sectionScope = query.sectionId
      ? [teacherAccessService.assertSection(ctx, query.sectionId)]
      : [...ctx.sectionIds];
    if (!sectionScope.length) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } };

    const filter = { schoolId: oid(ctx.schoolId), sectionId: { $in: oids(sectionScope) } };
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = validDate(query.from);
      if (query.to) filter.date.$lte = validDate(query.to);
    }
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      StudentAttendance.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
      StudentAttendance.countDocuments(filter),
    ]);
    return {
      data: rows.map((r) => {
        const j = r.toPublicJSON();
        return {
          id: j.id,
          date: j.date,
          sectionId: j.sectionId,
          sectionName: j.sectionName,
          className: j.className,
          summary: j.summary,
          locked: j.locked,
          markedByName: j.markedByName,
        };
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async sectionHistory(ctx, sectionId, query = {}) {
    teacherAccessService.assertSection(ctx, sectionId);
    return this.history(ctx, { ...query, sectionId });
  }

  async studentLog(ctx, studentId, query = {}) {
    await teacherAccessService.assertStudent(ctx, studentId);
    const filter = {
      schoolId: oid(ctx.schoolId),
      sectionId: { $in: oids(ctx.sectionIds) },
      'entries.studentId': oid(studentId),
    };
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = validDate(query.from);
      if (query.to) filter.date.$lte = validDate(query.to);
    }
    const rows = await StudentAttendance.find(filter).sort({ date: -1 }).limit(120).lean();
    const log = [];
    const tally = { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, LEAVE: 0 };
    for (const row of rows) {
      const e = (row.entries || []).find((x) => String(x.studentId) === String(studentId));
      if (!e) continue;
      tally[e.status] = (tally[e.status] || 0) + 1;
      log.push({ date: row.date, status: e.status, note: e.note || '', sectionId: String(row.sectionId) });
    }
    const total = log.length;
    const present = tally.PRESENT + tally.LATE + tally.HALF_DAY;
    return { studentId: String(studentId), total, present, presentRate: total ? Math.round((present / total) * 100) : null, tally, log };
  }

  async summary(ctx, query = {}) {
    const sectionId = teacherAccessService.assertSection(ctx, query.sectionId);
    const month = /^\d{4}-\d{2}$/.test(String(query.month || '')) ? query.month : todayStr().slice(0, 7);
    const rows = await StudentAttendance.find({
      schoolId: oid(ctx.schoolId),
      sectionId: oid(sectionId),
      date: { $gte: `${month}-01`, $lte: `${month}-31` },
    }).lean();
    const totals = { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, LEAVE: 0 };
    let daysMarked = 0;
    for (const row of rows) {
      daysMarked += 1;
      for (const e of row.entries || []) totals[e.status] = (totals[e.status] || 0) + 1;
    }
    const marked = Object.values(totals).reduce((a, b) => a + b, 0);
    const present = totals.PRESENT + totals.LATE + totals.HALF_DAY;
    return {
      sectionId,
      month,
      daysMarked,
      totals,
      presentRate: marked ? Math.round((present / marked) * 100) : null,
    };
  }
}

export const teacherAttendanceService = new TeacherAttendanceService();
