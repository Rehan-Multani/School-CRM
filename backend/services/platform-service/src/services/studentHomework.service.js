import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Homework } from '../models/Homework.js';
import { HomeworkSubmission } from '../models/HomeworkSubmission.js';
import { homeworkLite, homeworkDetail } from '../serializers/student.serializers.js';
import { toTeacherResourcePublicPath } from '../utils/upload.utils.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const SUBMITTED_STATES = new Set(['SUBMITTED', 'LATE', 'GRADED']);

function derivedStatus(hw, sub) {
  if (sub && SUBMITTED_STATES.has(sub.status)) return sub.status === 'GRADED' ? 'completed' : 'completed';
  const overdue = hw.dueDate && new Date(hw.dueDate).getTime() < Date.now();
  return overdue ? 'overdue' : 'pending';
}

class StudentHomeworkService {
  /** All homework for the student's section, merged with the student's own submission row. */
  async #merged(ctx) {
    // List-card fields only (homeworkLite + derivedStatus): the description can
    // be long and a section accumulates a whole year of homework.
    const rows = await Homework.find({ schoolId: oid(ctx.schoolId), sectionId: oid(ctx.sectionId) })
      .select('title subjectId subjectName teacherName assignedDate dueDate status attachments')
      .sort({ dueDate: -1, assignedDate: -1 })
      .lean();
    const ids = rows.map((r) => r._id);
    const subs = ids.length
      ? await HomeworkSubmission.find({
          schoolId: oid(ctx.schoolId),
          studentId: oid(ctx.studentId),
          homeworkId: { $in: ids },
        })
          .select('homeworkId status submittedAt marksObtained')
          .lean()
      : [];
    const subByHw = new Map(subs.map((s) => [String(s.homeworkId), s]));
    return rows.map((hw) => ({ hw, sub: subByHw.get(String(hw._id)) || null }));
  }

  async list(ctx, query = {}) {
    const wanted = String(query.status || 'all').toLowerCase();
    let merged = await this.#merged(ctx);
    if (['pending', 'completed', 'overdue'].includes(wanted)) {
      merged = merged.filter(({ hw, sub }) => derivedStatus(hw, sub) === wanted);
    }
    const { page, limit } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const start = (page - 1) * limit;
    return {
      data: merged.slice(start, start + limit).map(({ hw, sub }) => homeworkLite(hw, sub)),
      pagination: { page, limit, total: merged.length, totalPages: Math.ceil(merged.length / limit) || 1 },
    };
  }

  async pending(ctx, query = {}) {
    return this.list(ctx, { ...query, status: 'pending' });
  }

  async completed(ctx, query = {}) {
    return this.list(ctx, { ...query, status: 'completed' });
  }

  async get(ctx, id) {
    const hw = await Homework.findOne({ schoolId: oid(ctx.schoolId), sectionId: oid(ctx.sectionId), _id: oid(id) }).lean();
    if (!hw) throw new AppError('Homework not found', 404, STUDENT_ERR.NOT_FOUND);
    const sub = await HomeworkSubmission.findOne({
      schoolId: oid(ctx.schoolId),
      studentId: oid(ctx.studentId),
      homeworkId: hw._id,
    }).lean();
    return homeworkDetail(hw, sub);
  }

  /**
   * Student submits (or re-submits while still PENDING/LATE, before it is graded).
   * `file` is the multer file (optional); `body.remarks` optional text.
   */
  async submit(ctx, id, body = {}, file = null) {
    const hw = await Homework.findOne({ schoolId: oid(ctx.schoolId), sectionId: oid(ctx.sectionId), _id: oid(id) }).lean();
    if (!hw) throw new AppError('Homework not found', 404, STUDENT_ERR.NOT_FOUND);
    if (hw.status === 'CLOSED') {
      throw new AppError('This homework is closed for submissions', 409, STUDENT_ERR.SUBMISSION_WINDOW_CLOSED);
    }

    const existing = await HomeworkSubmission.findOne({
      schoolId: oid(ctx.schoolId),
      studentId: oid(ctx.studentId),
      homeworkId: hw._id,
    });
    if (existing && existing.status === 'GRADED') {
      throw new AppError('This homework has already been graded', 409, STUDENT_ERR.ALREADY_SUBMITTED);
    }

    const now = new Date();
    const late = hw.dueDate && now.getTime() > new Date(hw.dueDate).getTime();
    const attachments = [];
    if (file) {
      attachments.push({ name: file.originalname || file.filename, url: toTeacherResourcePublicPath(file.filename) });
    } else if (existing) {
      attachments.push(...(existing.attachments || []));
    }
    if (!attachments.length && !String(body.remarks || '').trim() && !existing) {
      throw new AppError('Attach a file or add remarks to submit', 400, STUDENT_ERR.VALIDATION_ERROR);
    }

    const patch = {
      schoolId: oid(ctx.schoolId),
      homeworkId: hw._id,
      studentId: oid(ctx.studentId),
      studentName: [ctx.student?.firstName, ctx.student?.lastName].filter(Boolean).join(' ').trim(),
      rollNumber: ctx.rollNumber || '',
      status: late ? 'LATE' : 'SUBMITTED',
      submittedAt: now,
      remarks: String(body.remarks || '').trim().slice(0, 1000),
      attachments,
    };

    const doc = await HomeworkSubmission.findOneAndUpdate(
      { schoolId: oid(ctx.schoolId), homeworkId: hw._id, studentId: oid(ctx.studentId) },
      { $set: patch },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    if (!existing) {
      await Homework.updateOne({ _id: hw._id }, { $inc: { submittedCount: 1 } });
    }
    return homeworkDetail(hw, doc.toPublicJSON());
  }
}

export const studentHomeworkService = new StudentHomeworkService();
