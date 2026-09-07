import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { homeworkRepository } from '../repositories/homework.repository.js';
import { academicRepository } from '../repositories/academic.repository.js';
import { HomeworkSubmission } from '../models/HomeworkSubmission.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { teacherAccessService } from './teacherAccess.service.js';
import { homeworkLite } from '../serializers/teacher.serializers.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const TITLE_MAX = 200;
const DESC_MAX = 5000;
const ATTACH_MAX = 10;

function validateDates(assigned, due) {
  const a = assigned ? new Date(assigned) : new Date();
  const d = new Date(due);
  if (Number.isNaN(a.getTime())) throw new AppError('assignedDate is invalid', 400, TEACHER_ERR.VALIDATION_ERROR);
  if (Number.isNaN(d.getTime())) throw new AppError('A valid dueDate is required', 400, TEACHER_ERR.VALIDATION_ERROR);
  if (d.getTime() < a.getTime()) throw new AppError('dueDate must be on or after assignedDate', 400, TEACHER_ERR.VALIDATION_ERROR);
  return { assignedDate: a, dueDate: d };
}

function cleanAttachments(v) {
  if (v === undefined) return undefined;
  if (!Array.isArray(v)) throw new AppError('attachments must be an array', 400, TEACHER_ERR.VALIDATION_ERROR);
  if (v.length > ATTACH_MAX) throw new AppError(`At most ${ATTACH_MAX} attachments`, 400, TEACHER_ERR.VALIDATION_ERROR);
  return v
    .map((a) => ({ name: String(a?.name || '').trim().slice(0, 200), url: String(a?.url || '').trim().slice(0, 1000) }))
    .filter((a) => a.url);
}

async function resolveNames(schoolId, { sectionId, subjectId }) {
  const [section, subject] = await Promise.all([
    sectionId ? academicRepository.findSectionById(schoolId, sectionId) : null,
    subjectId ? academicRepository.findSubjectById(schoolId, subjectId) : null,
  ]);
  const cls = section?.classId ? await academicRepository.findClassById(schoolId, section.classId) : null;
  return {
    className: cls?.name || '',
    sectionName: section?.name || '',
    subjectName: subject?.name || '',
    classIdResolved: section?.classId || null,
  };
}

class TeacherHomeworkService {
  async list(ctx, query = {}) {
    const { items, total, page, limit } = await homeworkRepository.list(ctx.schoolId, {
      ...query,
      teacherId: ctx.teacherId,
      page: query.page,
      limit: query.limit || 20,
    });
    return {
      data: items.map(homeworkLite),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async get(ctx, id) {
    const doc = await homeworkRepository.findById(ctx.schoolId, id);
    if (!doc) throw new AppError('Homework not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(doc, ctx.teacherId);
    return doc.toPublicJSON();
  }

  async create(ctx, payload = {}, actorName = '') {
    const title = String(payload.title || '').trim();
    if (!title) throw new AppError('Homework title is required', 400, TEACHER_ERR.VALIDATION_ERROR);
    if (title.length > TITLE_MAX) throw new AppError(`Title too long (max ${TITLE_MAX})`, 400, TEACHER_ERR.VALIDATION_ERROR);
    const description = String(payload.description || '').trim().slice(0, DESC_MAX);

    const sectionId = String(payload.sectionId || '');
    const subjectId = String(payload.subjectId || '');
    teacherAccessService.assertSection(ctx, sectionId);
    teacherAccessService.assertSubjectInSection(ctx, sectionId, subjectId);

    const { assignedDate, dueDate } = validateDates(payload.assignedDate, payload.dueDate);
    const names = await resolveNames(ctx.schoolId, { sectionId, subjectId });
    const attachments = cleanAttachments(payload.attachments) || [];

    const totalStudents = await StudentEnrollment.countDocuments({
      schoolId: oid(ctx.schoolId),
      sectionId: oid(sectionId),
      status: 'ACTIVE',
    });

    const doc = await homeworkRepository.create(ctx.schoolId, {
      academicYearId: ctx.currentYearId || null,
      classId: names.classIdResolved,
      className: names.className,
      sectionId: oid(sectionId),
      sectionName: names.sectionName,
      subjectId: oid(subjectId),
      subjectName: names.subjectName,
      teacherId: oid(ctx.teacherId),
      teacherName: actorName,
      title,
      description,
      assignedDate,
      dueDate,
      attachments,
      status: 'ASSIGNED',
      totalStudents,
      createdByName: actorName,
    });
    return doc.toPublicJSON();
  }

  async update(ctx, id, payload = {}) {
    const existing = await homeworkRepository.findById(ctx.schoolId, id);
    if (!existing) throw new AppError('Homework not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(existing, ctx.teacherId);

    const patch = {};
    if (payload.title !== undefined) {
      const t = String(payload.title).trim();
      if (!t) throw new AppError('Title cannot be empty', 400, TEACHER_ERR.VALIDATION_ERROR);
      patch.title = t.slice(0, TITLE_MAX);
    }
    if (payload.description !== undefined) patch.description = String(payload.description).trim().slice(0, DESC_MAX);
    const att = cleanAttachments(payload.attachments);
    if (att !== undefined) patch.attachments = att;
    if (payload.status !== undefined) {
      const s = String(payload.status).toUpperCase();
      if (!['ASSIGNED', 'CLOSED'].includes(s)) throw new AppError('status must be ASSIGNED or CLOSED', 400, TEACHER_ERR.VALIDATION_ERROR);
      patch.status = s;
    }
    if (payload.assignedDate !== undefined || payload.dueDate !== undefined) {
      const { assignedDate, dueDate } = validateDates(
        payload.assignedDate ?? existing.assignedDate,
        payload.dueDate ?? existing.dueDate
      );
      patch.assignedDate = assignedDate;
      patch.dueDate = dueDate;
    }
    // Section/subject can be moved only within the teacher's own assignments.
    if (payload.sectionId !== undefined || payload.subjectId !== undefined) {
      const sectionId = String(payload.sectionId ?? existing.sectionId);
      const subjectId = String(payload.subjectId ?? existing.subjectId);
      teacherAccessService.assertSection(ctx, sectionId);
      teacherAccessService.assertSubjectInSection(ctx, sectionId, subjectId);
      const names = await resolveNames(ctx.schoolId, { sectionId, subjectId });
      Object.assign(patch, {
        sectionId: oid(sectionId),
        subjectId: oid(subjectId),
        classId: names.classIdResolved,
        className: names.className,
        sectionName: names.sectionName,
        subjectName: names.subjectName,
      });
    }

    const doc = await homeworkRepository.update(ctx.schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async remove(ctx, id) {
    const existing = await homeworkRepository.findById(ctx.schoolId, id);
    if (!existing) throw new AppError('Homework not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(existing, ctx.teacherId);
    await homeworkRepository.remove(ctx.schoolId, id);
    await HomeworkSubmission.deleteMany({ homeworkId: oid(id) });
    return { message: 'Homework deleted' };
  }

  /** Roster left-joined with any HomeworkSubmission rows. */
  async submissions(ctx, id) {
    const hw = await homeworkRepository.findById(ctx.schoolId, id);
    if (!hw) throw new AppError('Homework not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(hw, ctx.teacherId);

    const [enrollments, subs] = await Promise.all([
      StudentEnrollment.find({ schoolId: oid(ctx.schoolId), sectionId: hw.sectionId, status: 'ACTIVE' })
        .select('studentId rollNumber')
        .lean(),
      HomeworkSubmission.find({ schoolId: oid(ctx.schoolId), homeworkId: hw._id }).lean(),
    ]);
    const subMap = new Map(subs.map((s) => [String(s.studentId), s]));
    const Student = mongoose.model('Student');
    const students = await Student.find({
      schoolId: oid(ctx.schoolId),
      _id: { $in: enrollments.map((e) => e.studentId) },
    })
      .select('firstName lastName')
      .lean();
    const nameMap = new Map(students.map((s) => [String(s._id), [s.firstName, s.lastName].filter(Boolean).join(' ')]));

    const rows = enrollments.map((e) => {
      const s = subMap.get(String(e.studentId));
      return {
        studentId: String(e.studentId),
        studentName: nameMap.get(String(e.studentId)) || '',
        rollNumber: e.rollNumber || '',
        status: s?.status || 'PENDING',
        submittedAt: s?.submittedAt || null,
        marksObtained: s?.marksObtained ?? null,
        remarks: s?.remarks || '',
      };
    });
    const submitted = rows.filter((r) => r.status !== 'PENDING').length;
    return {
      homework: homeworkLite(hw.toPublicJSON()),
      summary: { total: rows.length, submitted, pending: rows.length - submitted },
      submissions: rows,
    };
  }
}

export const teacherHomeworkService = new TeacherHomeworkService();
