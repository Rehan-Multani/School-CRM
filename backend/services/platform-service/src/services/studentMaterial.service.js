import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { materialLite } from '../serializers/student.serializers.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

class StudentMaterialService {
  /** ACTIVE material visible to the student: their section, or their whole class. */
  #visibleFilter(ctx) {
    const or = [{ visibility: 'SECTION', sectionId: oid(ctx.sectionId) }];
    if (ctx.classId) or.push({ visibility: 'CLASS', classId: oid(ctx.classId) });
    return { schoolId: oid(ctx.schoolId), status: 'ACTIVE', $or: or };
  }

  async list(ctx, query = {}) {
    const filter = this.#visibleFilter(ctx);
    if (query.subjectId && mongoose.isValidObjectId(String(query.subjectId))) {
      filter.subjectId = oid(query.subjectId);
    }
    if (query.type) filter.fileType = String(query.type).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = new Date(`${query.from}T00:00:00.000Z`);
      if (query.to) filter.createdAt.$lte = new Date(`${query.to}T23:59:59.999Z`);
    }
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      StudyMaterial.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      StudyMaterial.countDocuments(filter),
    ]);
    return {
      data: rows.map(materialLite),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async get(ctx, id) {
    const row = await StudyMaterial.findOne({ ...this.#visibleFilter(ctx), _id: oid(id) }).lean();
    if (!row) throw new AppError('Study material not found', 404, STUDENT_ERR.NOT_FOUND);
    return { ...materialLite(row), url: row.url || '' };
  }

  async downloadUrl(ctx, id) {
    const row = await StudyMaterial.findOne({ ...this.#visibleFilter(ctx), _id: oid(id) }).select('url fileName fileType').lean();
    if (!row) throw new AppError('Study material not found', 404, STUDENT_ERR.NOT_FOUND);
    if (!row.url) throw new AppError('This material has no downloadable file', 404, STUDENT_ERR.NOT_FOUND);
    return { url: row.url, fileName: row.fileName || '', fileType: row.fileType || '', expiresIn: null };
  }
}

export const studentMaterialService = new StudentMaterialService();
