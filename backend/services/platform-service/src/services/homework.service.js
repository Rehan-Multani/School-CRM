import { AppError } from '../../../shared/AppError.js';
import { homeworkRepository } from '../repositories/homework.repository.js';
import { HOMEWORK_STATUSES } from '../models/Homework.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { Subject } from '../models/Subject.js';
import { Teacher } from '../models/Teacher.js';

function toInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
}

function validateDates(assignedDate, dueDate) {
  const a = new Date(assignedDate);
  const d = new Date(dueDate);
  if (Number.isNaN(a.getTime())) throw new AppError('A valid assigned date is required', 400);
  if (Number.isNaN(d.getTime())) throw new AppError('A valid due date is required', 400);
  if (d.getTime() < a.getTime()) throw new AppError('Due date must be on or after the assigned date', 400);
  return { assignedDate: a, dueDate: d };
}

async function resolveNames(schoolId, payload) {
  const out = {};
  if (payload.classId) {
    const c = await SchoolClass.findOne({ schoolId, _id: payload.classId }).lean();
    out.className = c?.name || payload.className || '';
  }
  if (payload.sectionId) {
    const s = await Section.findOne({ schoolId, _id: payload.sectionId }).lean();
    out.sectionName = s?.name || payload.sectionName || '';
  }
  if (payload.subjectId) {
    const s = await Subject.findOne({ schoolId, _id: payload.subjectId }).lean();
    out.subjectName = s?.name || payload.subjectName || '';
  }
  if (payload.teacherId) {
    const t = await Teacher.findOne({ schoolId, _id: payload.teacherId }).lean();
    out.teacherName = t ? [t.firstName, t.lastName].filter(Boolean).join(' ') || t.name || '' : payload.teacherName || '';
  }
  return out;
}

function normalizeCounts({ totalStudents, submittedCount, evaluatedCount }) {
  const total = toInt(totalStudents, 0);
  let submitted = toInt(submittedCount, 0);
  let evaluated = toInt(evaluatedCount, 0);
  if (total > 0) submitted = Math.min(submitted, total);
  evaluated = Math.min(evaluated, submitted);
  return { totalStudents: total, submittedCount: submitted, evaluatedCount: evaluated };
}

class HomeworkService {
  async list(schoolId, query = {}) {
    const { items, total, page, limit } = await homeworkRepository.list(schoolId, query);
    return {
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async stats(schoolId, query = {}) {
    return homeworkRepository.stats(schoolId, query);
  }

  async monitor(schoolId, query = {}) {
    return homeworkRepository.monitor(schoolId, query);
  }

  async get(schoolId, id) {
    const doc = await homeworkRepository.findById(schoolId, id);
    if (!doc) throw new AppError('Homework not found', 404);
    return doc.toPublicJSON();
  }

  async create(schoolId, payload = {}, actorName = '') {
    const title = (payload.title || '').trim();
    if (!title) throw new AppError('Homework title is required', 400);
    const { assignedDate, dueDate } = validateDates(payload.assignedDate || new Date(), payload.dueDate);
    const names = await resolveNames(schoolId, payload);
    const counts = normalizeCounts(payload);

    const doc = await homeworkRepository.create(schoolId, {
      academicYearId: payload.academicYearId || null,
      classId: payload.classId || null,
      sectionId: payload.sectionId || null,
      subjectId: payload.subjectId || null,
      teacherId: payload.teacherId || null,
      title,
      description: (payload.description || '').trim(),
      assignedDate,
      dueDate,
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      status: HOMEWORK_STATUSES.includes(String(payload.status).toUpperCase())
        ? String(payload.status).toUpperCase()
        : 'ASSIGNED',
      ...counts,
      ...names,
      createdByName: actorName,
    });
    return doc.toPublicJSON();
  }

  async update(schoolId, id, payload = {}) {
    const existing = await homeworkRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Homework not found', 404);

    const patch = {};
    if (payload.title !== undefined) {
      const t = (payload.title || '').trim();
      if (!t) throw new AppError('Homework title cannot be empty', 400);
      patch.title = t;
    }
    if (payload.description !== undefined) patch.description = (payload.description || '').trim();
    if (payload.attachments !== undefined) {
      patch.attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
    }
    if (payload.status !== undefined && HOMEWORK_STATUSES.includes(String(payload.status).toUpperCase())) {
      patch.status = String(payload.status).toUpperCase();
    }

    const nextAssigned = payload.assignedDate !== undefined ? payload.assignedDate : existing.assignedDate;
    const nextDue = payload.dueDate !== undefined ? payload.dueDate : existing.dueDate;
    if (payload.assignedDate !== undefined || payload.dueDate !== undefined) {
      const { assignedDate, dueDate } = validateDates(nextAssigned, nextDue);
      patch.assignedDate = assignedDate;
      patch.dueDate = dueDate;
    }

    if (['classId', 'sectionId', 'subjectId', 'teacherId'].some((k) => payload[k] !== undefined)) {
      const merged = {
        classId: payload.classId !== undefined ? payload.classId : existing.classId,
        sectionId: payload.sectionId !== undefined ? payload.sectionId : existing.sectionId,
        subjectId: payload.subjectId !== undefined ? payload.subjectId : existing.subjectId,
        teacherId: payload.teacherId !== undefined ? payload.teacherId : existing.teacherId,
      };
      Object.assign(patch, merged, await resolveNames(schoolId, merged));
    }

    if (['totalStudents', 'submittedCount', 'evaluatedCount'].some((k) => payload[k] !== undefined)) {
      Object.assign(
        patch,
        normalizeCounts({
          totalStudents: payload.totalStudents !== undefined ? payload.totalStudents : existing.totalStudents,
          submittedCount: payload.submittedCount !== undefined ? payload.submittedCount : existing.submittedCount,
          evaluatedCount: payload.evaluatedCount !== undefined ? payload.evaluatedCount : existing.evaluatedCount,
        })
      );
    }

    const doc = await homeworkRepository.update(schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async remove(schoolId, id) {
    const doc = await homeworkRepository.remove(schoolId, id);
    if (!doc) throw new AppError('Homework not found', 404);
    return { success: true, message: 'Homework deleted successfully' };
  }
}

export const homeworkService = new HomeworkService();
