import mongoose from 'mongoose';
import { TimetableEntry } from '../models/TimetableEntry.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

class TimetableRepository {
  list(schoolId, filters = {}) {
    const q = { schoolId: oid(schoolId) };
    if (filters.classId) q.classId = oid(filters.classId);
    if (filters.sectionId) q.sectionId = oid(filters.sectionId);
    if (filters.teacherId) q.teacherId = oid(filters.teacherId);
    if (filters.day) q.dayOfWeek = String(filters.day).toUpperCase().slice(0, 3);
    if (filters.status) q.status = filters.status;
    return TimetableEntry.find(q).sort({ dayOfWeek: 1, periodNumber: 1 }).lean();
  }

  findById(schoolId, id) {
    return TimetableEntry.findOne({ schoolId: oid(schoolId), _id: oid(id) });
  }

  create(payload) {
    return TimetableEntry.create(payload);
  }

  update(schoolId, id, patch) {
    return TimetableEntry.findOneAndUpdate({ schoolId: oid(schoolId), _id: oid(id) }, patch, {
      new: true,
      runValidators: true,
    });
  }

  remove(schoolId, id) {
    return TimetableEntry.findOneAndDelete({ schoolId: oid(schoolId), _id: oid(id) });
  }

  /** Every ACTIVE slot of these teachers that lives in a different section. */
  findTeacherClashesOutsideSection(schoolId, sectionId, teacherIds = []) {
    if (!teacherIds.length) return Promise.resolve([]);
    return TimetableEntry.find({
      schoolId: oid(schoolId),
      sectionId: { $ne: oid(sectionId) },
      teacherId: { $in: teacherIds.map(oid) },
      status: 'ACTIVE',
    }).lean();
  }

  /** Delete + insert a section's grid (validated by the service beforehand). */
  async replaceSection(schoolId, sectionId, docs) {
    await TimetableEntry.deleteMany({ schoolId: oid(schoolId), sectionId: oid(sectionId) });
    if (!docs.length) return [];
    const inserted = await TimetableEntry.insertMany(docs, { ordered: true });
    return inserted.map((d) => d.toObject());
  }

  /** A teacher cannot be in two rooms in the same day+period. */
  findTeacherClash(schoolId, { teacherId, dayOfWeek, periodNumber, excludeId = null }) {
    if (!teacherId) return Promise.resolve(null);
    const q = {
      schoolId: oid(schoolId),
      teacherId: oid(teacherId),
      dayOfWeek,
      periodNumber,
      status: 'ACTIVE',
    };
    if (excludeId) q._id = { $ne: oid(excludeId) };
    return TimetableEntry.findOne(q).lean();
  }
}

export const timetableRepository = new TimetableRepository();
