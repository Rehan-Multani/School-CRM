import { AppError } from '../../../shared/AppError.js';
import { timetableRepository } from '../repositories/timetable.repository.js';
import { academicRepository } from '../repositories/academic.repository.js';
import { TimetableEntry, TIMETABLE_DAYS } from '../models/TimetableEntry.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const teacherName = (t) => (t ? [t.firstName, t.lastName].filter(Boolean).join(' ') || t.name || '' : '');

function validateSlot(payload) {
  const day = String(payload.dayOfWeek || '').toUpperCase().slice(0, 3);
  if (!TIMETABLE_DAYS.includes(day)) {
    throw new AppError(`dayOfWeek must be one of ${TIMETABLE_DAYS.join(', ')}`, 400);
  }
  const period = Number(payload.periodNumber);
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
    if (clash) throw new AppError('This teacher already has a class in that day/period', 409, 'TIMETABLE_CLASH');

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
    if (clash) throw new AppError('This teacher already has a class in that day/period', 409, 'TIMETABLE_CLASH');

    try {
      const doc = await timetableRepository.update(schoolId, id, patch);
      return doc.toPublicJSON();
    } catch (error) {
      if (error?.code === 11000) throw new AppError('That section already has a period at this day/number', 409, 'TIMETABLE_CLASH');
      throw error;
    }
  }

  async remove(schoolId, id) {
    const removed = await timetableRepository.remove(schoolId, id);
    if (!removed) throw new AppError('Timetable entry not found', 404);
    return { message: 'Timetable entry removed' };
  }
}

export const timetableService = new TimetableService();
