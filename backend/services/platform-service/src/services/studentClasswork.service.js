import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Assignment } from '../models/Assignment.js';
import { classworkLite } from '../serializers/student.serializers.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/**
 * "Classwork" for the Student APK maps to the teacher `Assignment` model —
 * in-class / take-home work a teacher publishes to the student's section.
 * Students see PUBLISHED and CLOSED items only (never DRAFT), read-only.
 */
class StudentClassworkService {
  #visibleFilter(ctx) {
    return {
      schoolId: oid(ctx.schoolId),
      sectionId: oid(ctx.sectionId),
      status: { $in: ['PUBLISHED', 'CLOSED'] },
    };
  }

  async list(ctx, query = {}) {
    const filter = this.#visibleFilter(ctx);
    if (query.subjectId && mongoose.isValidObjectId(String(query.subjectId))) {
      filter.subjectId = oid(query.subjectId);
    }
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      Assignment.find(filter).sort({ assignedDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Assignment.countDocuments(filter),
    ]);
    return {
      data: rows.map(classworkLite),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async get(ctx, id) {
    const row = await Assignment.findOne({ ...this.#visibleFilter(ctx), _id: oid(id) }).lean();
    if (!row) throw new AppError('Classwork not found', 404, STUDENT_ERR.NOT_FOUND);
    return {
      ...classworkLite(row),
      description: row.description || '',
      instructions: row.instructions || '',
      attachments: row.attachments || [],
    };
  }
}

export const studentClassworkService = new StudentClassworkService();
