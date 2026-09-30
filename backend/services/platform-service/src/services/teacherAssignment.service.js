import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { safeLinkUrl, scalarQuery } from '../../../shared/sanitize.js';
import { assignmentRepository } from '../repositories/assignment.repository.js';
import { academicRepository } from '../repositories/academic.repository.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { teacherAccessService } from './teacherAccess.service.js';
import { assignmentLite } from '../serializers/teacher.serializers.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';
import { pushEvents } from './pushEvents.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const TITLE_MAX = 200;
const DESC_MAX = 5000;

function validateDates(assigned, due) {
  const a = assigned ? new Date(assigned) : new Date();
  const d = new Date(due);
  if (Number.isNaN(a.getTime())) throw new AppError('assignedDate is invalid', 400, TEACHER_ERR.VALIDATION_ERROR);
  if (Number.isNaN(d.getTime())) throw new AppError('A valid dueDate is required', 400, TEACHER_ERR.VALIDATION_ERROR);
  if (d.getTime() < a.getTime()) throw new AppError('dueDate must be on or after assignedDate', 400, TEACHER_ERR.VALIDATION_ERROR);
  return { assignedDate: a, dueDate: d };
}

function maxMarksOf(v, fallback = 100) {
  if (v === undefined) return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1 || n > 1000) throw new AppError('maxMarks must be between 1 and 1000', 400, TEACHER_ERR.VALIDATION_ERROR);
  return n;
}

async function resolveNames(schoolId, { sectionId, subjectId }) {
  const [section, subject] = await Promise.all([
    sectionId ? academicRepository.findSectionById(schoolId, sectionId) : null,
    subjectId ? academicRepository.findSubjectById(schoolId, subjectId) : null,
  ]);
  return {
    classId: section?.classId || null,
    className: '',
    sectionName: section?.name || '',
    subjectName: subject?.name || '',
    _section: section,
  };
}

class TeacherAssignmentService {
  async list(ctx, query = {}) {
    const { items, total, page, limit } = await assignmentRepository.list(ctx.schoolId, { ...scalarQuery(query), teacherId: ctx.teacherId });
    return {
      data: items.map((d) => assignmentLite(d.toPublicJSON())),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async get(ctx, id) {
    const doc = await assignmentRepository.findById(ctx.schoolId, id);
    if (!doc) throw new AppError('Assignment not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(doc, ctx.teacherId);
    return doc.toPublicJSON();
  }

  async create(ctx, payload = {}, actorName = '') {
    const title = String(payload.title || '').trim();
    if (!title) throw new AppError('Assignment title is required', 400, TEACHER_ERR.VALIDATION_ERROR);
    const sectionId = String(payload.sectionId || '');
    const subjectId = String(payload.subjectId || '');
    teacherAccessService.assertSection(ctx, sectionId);
    teacherAccessService.assertSubjectInSection(ctx, sectionId, subjectId);

    const { assignedDate, dueDate } = validateDates(payload.assignedDate, payload.dueDate);
    const maxMarks = maxMarksOf(payload.maxMarks);
    const names = await resolveNames(ctx.schoolId, { sectionId, subjectId });
    const cls = names.classId ? await academicRepository.findClassById(ctx.schoolId, names.classId) : null;

    const status = ['DRAFT', 'PUBLISHED', 'CLOSED'].includes(String(payload.status).toUpperCase())
      ? String(payload.status).toUpperCase()
      : 'PUBLISHED';

    const doc = await assignmentRepository.create({
      schoolId: oid(ctx.schoolId),
      academicYearId: ctx.currentYearId ? oid(ctx.currentYearId) : null,
      classId: names.classId,
      className: cls?.name || '',
      sectionId: oid(sectionId),
      sectionName: names.sectionName,
      subjectId: oid(subjectId),
      subjectName: names.subjectName,
      teacherId: oid(ctx.teacherId),
      teacherName: actorName,
      title: title.slice(0, TITLE_MAX),
      description: String(payload.description || '').trim().slice(0, DESC_MAX),
      instructions: String(payload.instructions || '').trim().slice(0, DESC_MAX),
      maxMarks,
      assignedDate,
      dueDate,
      attachments: Array.isArray(payload.attachments)
        ? payload.attachments.map((a) => ({ name: String(a?.name || '').slice(0, 200), url: safeLinkUrl(a?.url) })).filter((a) => a.url).slice(0, 10)
        : [],
      status,
      createdByName: actorName,
    });
    const json = doc.toPublicJSON();
    if (status === 'PUBLISHED') pushEvents.assignmentPublished(ctx.schoolId, json).catch(() => {});
    return json;
  }

  async update(ctx, id, payload = {}) {
    const existing = await assignmentRepository.findById(ctx.schoolId, id);
    if (!existing) throw new AppError('Assignment not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(existing, ctx.teacherId);

    const patch = {};
    if (payload.title !== undefined) {
      const t = String(payload.title).trim();
      if (!t) throw new AppError('Title cannot be empty', 400, TEACHER_ERR.VALIDATION_ERROR);
      patch.title = t.slice(0, TITLE_MAX);
    }
    if (payload.description !== undefined) patch.description = String(payload.description).trim().slice(0, DESC_MAX);
    if (payload.instructions !== undefined) patch.instructions = String(payload.instructions).trim().slice(0, DESC_MAX);
    if (payload.maxMarks !== undefined) patch.maxMarks = maxMarksOf(payload.maxMarks);
    if (payload.status !== undefined) {
      const s = String(payload.status).toUpperCase();
      if (!['DRAFT', 'PUBLISHED', 'CLOSED'].includes(s)) throw new AppError('Invalid status', 400, TEACHER_ERR.VALIDATION_ERROR);
      patch.status = s;
    }
    if (payload.assignedDate !== undefined || payload.dueDate !== undefined) {
      const { assignedDate, dueDate } = validateDates(payload.assignedDate ?? existing.assignedDate, payload.dueDate ?? existing.dueDate);
      patch.assignedDate = assignedDate;
      patch.dueDate = dueDate;
    }
    if (payload.attachments !== undefined) {
      if (!Array.isArray(payload.attachments)) throw new AppError('attachments must be an array', 400, TEACHER_ERR.VALIDATION_ERROR);
      patch.attachments = payload.attachments
        .map((a) => ({ name: String(a?.name || '').slice(0, 200), url: safeLinkUrl(a?.url) }))
        .filter((a) => a.url)
        .slice(0, 10);
    }
    if (payload.sectionId !== undefined || payload.subjectId !== undefined) {
      const sectionId = String(payload.sectionId ?? existing.sectionId);
      const subjectId = String(payload.subjectId ?? existing.subjectId);
      teacherAccessService.assertSection(ctx, sectionId);
      teacherAccessService.assertSubjectInSection(ctx, sectionId, subjectId);
      const names = await resolveNames(ctx.schoolId, { sectionId, subjectId });
      const cls = names.classId ? await academicRepository.findClassById(ctx.schoolId, names.classId) : null;
      Object.assign(patch, {
        sectionId: oid(sectionId),
        subjectId: oid(subjectId),
        classId: names.classId,
        className: cls?.name || '',
        sectionName: names.sectionName,
        subjectName: names.subjectName,
      });
    }

    const doc = await assignmentRepository.update(ctx.schoolId, id, patch);
    const json = doc.toPublicJSON();
    // DRAFT → PUBLISHED is when students first see it.
    if (patch.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') {
      pushEvents.assignmentPublished(ctx.schoolId, json).catch(() => {});
    }
    return json;
  }

  async remove(ctx, id) {
    const existing = await assignmentRepository.findById(ctx.schoolId, id);
    if (!existing) throw new AppError('Assignment not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(existing, ctx.teacherId);
    await assignmentRepository.remove(ctx.schoolId, id);
    await assignmentRepository.deleteSubmissionsFor(id);
    return { message: 'Assignment deleted' };
  }

  async submissions(ctx, id) {
    const asg = await assignmentRepository.findById(ctx.schoolId, id);
    if (!asg) throw new AppError('Assignment not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(asg, ctx.teacherId);

    const [enrollments, subs] = await Promise.all([
      StudentEnrollment.find({ schoolId: oid(ctx.schoolId), sectionId: asg.sectionId, status: 'ACTIVE' })
        .select('studentId rollNumber')
        .lean(),
      assignmentRepository.submissions(ctx.schoolId, id),
    ]);
    const subMap = new Map(subs.map((s) => [String(s.studentId), s]));
    const Student = mongoose.model('Student');
    const students = await Student.find({ schoolId: oid(ctx.schoolId), _id: { $in: enrollments.map((e) => e.studentId) } })
      .select('firstName lastName')
      .lean();
    const nameMap = new Map(students.map((s) => [String(s._id), [s.firstName, s.lastName].filter(Boolean).join(' ')]));

    const rows = enrollments.map((e) => {
      const s = subMap.get(String(e.studentId));
      return {
        submissionId: s ? String(s._id) : null,
        studentId: String(e.studentId),
        studentName: nameMap.get(String(e.studentId)) || '',
        rollNumber: e.rollNumber || '',
        status: s?.status || 'PENDING',
        submittedAt: s?.submittedAt || null,
        marksObtained: s?.marksObtained ?? null,
        feedback: s?.feedback || '',
      };
    });
    return {
      assignment: assignmentLite(asg.toPublicJSON()),
      summary: {
        total: rows.length,
        submitted: rows.filter((r) => r.status !== 'PENDING').length,
        graded: rows.filter((r) => r.status === 'GRADED').length,
      },
      submissions: rows,
    };
  }

  async grade(ctx, assignmentId, submissionId, payload = {}) {
    const asg = await assignmentRepository.findById(ctx.schoolId, assignmentId);
    if (!asg) throw new AppError('Assignment not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertOwnedBy(asg, ctx.teacherId);

    const sub = await assignmentRepository.submissionById(ctx.schoolId, submissionId);
    if (!sub || String(sub.assignmentId) !== String(assignmentId)) {
      throw new AppError('Submission not found', 404, TEACHER_ERR.NOT_FOUND);
    }
    const marks = Number(payload.marksObtained);
    if (!Number.isFinite(marks) || marks < 0 || marks > asg.maxMarks) {
      throw new AppError(`marksObtained must be between 0 and ${asg.maxMarks}`, 400, TEACHER_ERR.INVALID_MARKS);
    }
    sub.marksObtained = marks;
    sub.feedback = String(payload.feedback || '').trim().slice(0, 2000);
    sub.status = 'GRADED';
    sub.gradedBy = oid(ctx.teacherId);
    sub.gradedAt = new Date();
    await sub.save();
    await assignmentRepository.refreshCounts(ctx.schoolId, assignmentId);
    return sub.toPublicJSON();
  }
}

export const teacherAssignmentService = new TeacherAssignmentService();
