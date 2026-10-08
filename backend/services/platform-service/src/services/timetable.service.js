import { AppError } from '../../../shared/AppError.js';
import { timetableRepository } from '../repositories/timetable.repository.js';
import { academicRepository } from '../repositories/academic.repository.js';
import { TimetableEntry, TIMETABLE_DAYS } from '../models/TimetableEntry.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const teacherName = (t) => (t ? [t.firstName, t.lastName].filter(Boolean).join(' ') || t.name || '' : '');

/** "Priya Sharma already teaches Class 10 B on MON P3" — the grid editor parses "DAY Pn". */
function clashMessage(teacher, other) {
  const who = teacherName(teacher) || teacher?.name || 'This teacher';
  const where = [other.className, other.sectionName].filter(Boolean).join(' ') || 'another section';
  return `${who} already teaches ${where} on ${other.dayOfWeek} P${other.periodNumber}`;
}

function validateSlot(payload) {
  const day = String(payload.dayOfWeek || '').toUpperCase().slice(0, 3);
  if (!TIMETABLE_DAYS.includes(day)) {
    throw new AppError(`dayOfWeek must be one of ${TIMETABLE_DAYS.join(', ')}`, 400);
  }
  const period = Number(payload.periodNumber ?? payload.periodNo);
  if (!Number.isInteger(period) || period < 1 || period > 15) {
    throw new AppError('periodNumber must be an integer between 1 and 15', 400);
  }
  const startTime = String(payload.startTime || '').trim();
  const endTime = String(payload.endTime || '').trim();
  if (!HHMM.test(startTime) || !HHMM.test(endTime)) {
    throw new AppError('startTime and endTime must be HH:MM (24h)', 400);
  }
  if (endTime <= startTime) throw new AppError('endTime must be after startTime', 400);
  return { day, period, startTime, endTime };
}

class TimetableService {
  async list(schoolId, query = {}) {
    const rows = await timetableRepository.list(schoolId, query);
    return rows.map((r) => new TimetableEntry(r).toPublicJSON());
  }

  async create(schoolId, payload = {}) {
    const { day, period, startTime, endTime } = validateSlot(payload);
    const [section, subject] = await Promise.all([
      academicRepository.findSectionById(schoolId, payload.sectionId),
      academicRepository.findSubjectById(schoolId, payload.subjectId),
    ]);
    if (!section) throw new AppError('Section not found', 404);
    if (!subject) throw new AppError('Subject not found', 404);
    const cls = await academicRepository.findClassById(schoolId, section.classId);
    const teacher = payload.teacherId ? await academicRepository.findTeacherById(schoolId, payload.teacherId) : null;
    if (payload.teacherId && !teacher) throw new AppError('Teacher not found', 404);

    const clash = await timetableRepository.findTeacherClash(schoolId, {
      teacherId: payload.teacherId,
      dayOfWeek: day,
      periodNumber: period,
    });
    if (clash) throw new AppError(clashMessage(teacher, clash), 409, 'TIMETABLE_CLASH');

    try {
      const doc = await timetableRepository.create({
        schoolId,
        academicYearId: section.academicYearId,
        classId: section.classId,
        className: cls?.name || '',
        sectionId: section._id,
        sectionName: section.name || '',
        subjectId: subject._id,
        subjectName: subject.name || '',
        teacherId: teacher?._id || null,
        teacherName: teacherName(teacher),
        dayOfWeek: day,
        periodNumber: period,
        startTime,
        endTime,
        room: String(payload.room || '').trim(),
        status: 'ACTIVE',
      });
      return doc.toPublicJSON();
    } catch (error) {
      if (error?.code === 11000) {
        throw new AppError('That section already has a period at this day/number', 409, 'TIMETABLE_CLASH');
      }
      throw error;
    }
  }

  async update(schoolId, id, payload = {}) {
    const existing = await timetableRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Timetable entry not found', 404);

    const patch = {};
    if (
      payload.dayOfWeek !== undefined ||
      payload.periodNumber !== undefined ||
      payload.startTime !== undefined ||
      payload.endTime !== undefined
    ) {
      const merged = {
        dayOfWeek: payload.dayOfWeek ?? existing.dayOfWeek,
        periodNumber: payload.periodNumber ?? existing.periodNumber,
        startTime: payload.startTime ?? existing.startTime,
        endTime: payload.endTime ?? existing.endTime,
      };
      const v = validateSlot(merged);
      patch.dayOfWeek = v.day;
      patch.periodNumber = v.period;
      patch.startTime = v.startTime;
      patch.endTime = v.endTime;
    }
    if (payload.room !== undefined) patch.room = String(payload.room).trim();
    if (payload.status !== undefined) patch.status = payload.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    if (payload.teacherId !== undefined) {
      const teacher = payload.teacherId ? await academicRepository.findTeacherById(schoolId, payload.teacherId) : null;
      if (payload.teacherId && !teacher) throw new AppError('Teacher not found', 404);
      patch.teacherId = teacher?._id || null;
      patch.teacherName = teacherName(teacher);
    }
    if (payload.subjectId !== undefined) {
      const subject = await academicRepository.findSubjectById(schoolId, payload.subjectId);
      if (!subject) throw new AppError('Subject not found', 404);
      patch.subjectId = subject._id;
      patch.subjectName = subject.name || '';
    }

    const effectiveTeacher = patch.teacherId !== undefined ? patch.teacherId : existing.teacherId;
    const clash = await timetableRepository.findTeacherClash(schoolId, {
      teacherId: effectiveTeacher,
      dayOfWeek: patch.dayOfWeek ?? existing.dayOfWeek,
      periodNumber: patch.periodNumber ?? existing.periodNumber,
      excludeId: id,
    });
    if (clash) {
      const t = patch.teacherName !== undefined ? { name: patch.teacherName } : { name: existing.teacherName };
      throw new AppError(clashMessage(t, clash), 409, 'TIMETABLE_CLASH');
    }

    try {
      const doc = await timetableRepository.update(schoolId, id, patch);
      return doc.toPublicJSON();
    } catch (error) {
      if (error?.code === 11000) throw new AppError('That section already has a period at this day/number', 409, 'TIMETABLE_CLASH');
      throw error;
    }
  }

  /**
   * Replace a section's whole weekly grid (validate everything first, then
   * delete + insert). Body: { academicYearId?, periods: [{ dayOfWeek, periodNumber|periodNo,
   * startTime, endTime, subjectId, teacherId?, room? }] }. Empty cells are simply omitted.
   */
  async saveSectionGrid(schoolId, sectionId, payload = {}) {
    const section = await academicRepository.findSectionById(schoolId, sectionId);
    if (!section) throw new AppError('Section not found', 404);
    const cls = await academicRepository.findClassById(schoolId, section.classId);
    const academicYearId = payload.academicYearId || section.academicYearId;

    const periods = Array.isArray(payload.periods) ? payload.periods : null;
    if (!periods) throw new AppError('periods must be an array', 400);
    if (periods.length > 15 * TIMETABLE_DAYS.length) throw new AppError('Too many periods', 400);

    const slots = [];
    const seen = new Set();
    for (const p of periods) {
      const v = validateSlot(p || {});
      const key = `${v.day}-${v.period}`;
      if (seen.has(key)) throw new AppError(`Duplicate slot ${v.day} P${v.period} in payload`, 400);
      seen.add(key);
      if (!p.subjectId) throw new AppError(`subjectId is required for ${v.day} P${v.period}`, 400);
      slots.push({ ...v, subjectId: String(p.subjectId), teacherId: p.teacherId ? String(p.teacherId) : null, room: String(p.room || '').trim() });
    }

    const subjectIds = [...new Set(slots.map((s) => s.subjectId))];
    const teacherIds = [...new Set(slots.map((s) => s.teacherId).filter(Boolean))];
    const [subjects, teachers] = await Promise.all([
      academicRepository.findSubjectsByIds(schoolId, subjectIds),
      academicRepository.findTeachersByIds(schoolId, teacherIds),
    ]);
    const subjectMap = new Map(subjects.map((s) => [s._id.toString(), s]));
    const teacherMap = new Map(teachers.map((t) => [t._id.toString(), t]));
    for (const s of slots) {
      if (!subjectMap.has(s.subjectId)) throw new AppError(`Subject not found for ${s.day} P${s.period}`, 404);
      if (s.teacherId && !teacherMap.has(s.teacherId)) throw new AppError(`Teacher not found for ${s.day} P${s.period}`, 404);
    }

    // Teacher clash: same teacher, same day+period, in ANY other section of the school.
    const clashes = await timetableRepository.findTeacherClashesOutsideSection(schoolId, sectionId, teacherIds);
    const clashByKey = new Map(clashes.map((c) => [`${String(c.teacherId)}|${c.dayOfWeek}|${c.periodNumber}`, c]));
    const problems = [];
    for (const s of slots) {
      if (!s.teacherId) continue;
      const c = clashByKey.get(`${s.teacherId}|${s.day}|${s.period}`);
      if (c) problems.push(clashMessage(teacherMap.get(s.teacherId), c));
    }
    if (problems.length) throw new AppError(problems.join('; '), 409, 'TIMETABLE_CLASH');

    const docs = slots.map((s) => {
      const subject = subjectMap.get(s.subjectId);
      const teacher = s.teacherId ? teacherMap.get(s.teacherId) : null;
      return {
        schoolId,
        academicYearId,
        classId: section.classId,
        className: cls?.name || '',
        sectionId: section._id,
        sectionName: section.name || '',
        subjectId: subject._id,
        subjectName: subject.name || '',
        teacherId: teacher?._id || null,
        teacherName: teacherName(teacher),
        dayOfWeek: s.day,
        periodNumber: s.period,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room,
        status: 'ACTIVE',
      };
    });

    const inserted = await timetableRepository.replaceSection(schoolId, sectionId, docs);
    return inserted.map((d) => new TimetableEntry(d).toPublicJSON());
  }

  async remove(schoolId, id) {
    const removed = await timetableRepository.remove(schoolId, id);
    if (!removed) throw new AppError('Timetable entry not found', 404);
    return { message: 'Timetable entry removed' };
  }
}

export const timetableService = new TimetableService();
