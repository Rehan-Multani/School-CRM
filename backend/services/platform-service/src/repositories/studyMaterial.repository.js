import mongoose from 'mongoose';
import { StudyMaterial } from '../models/StudyMaterial.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

class StudyMaterialRepository {
  async list(schoolId, query = {}) {
    const filter = { schoolId: oid(schoolId), status: 'ACTIVE' };
    if (query.teacherId) filter.teacherId = oid(query.teacherId);
    if (query.sectionId) filter.sectionId = oid(query.sectionId);
    if (query.classId) filter.classId = oid(query.classId);
    if (query.subjectId) filter.subjectId = oid(query.subjectId);
    if (query.q?.trim()) {
      const rx = new RegExp(escapeRegex(query.q.trim()), 'i');
      filter.$or = [{ title: rx }, { description: rx }, { subjectName: rx }];
    }
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [items, total] = await Promise.all([
      StudyMaterial.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StudyMaterial.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  findById(schoolId, id) {
    return StudyMaterial.findOne({ schoolId: oid(schoolId), _id: oid(id) });
  }

  create(data) {
    return StudyMaterial.create(data);
  }

  update(schoolId, id, patch) {
    return StudyMaterial.findOneAndUpdate({ schoolId: oid(schoolId), _id: oid(id) }, { $set: patch }, { new: true });
  }

  remove(schoolId, id) {
    return StudyMaterial.findOneAndDelete({ schoolId: oid(schoolId), _id: oid(id) });
  }
}

export const studyMaterialRepository = new StudyMaterialRepository();
