import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { ExamType } from '../models/ExamType.js';
import { Exam } from '../models/Exam.js';
import { School } from '../models/School.js';

// What every school starts with (same set the UI used to hardcode).
const DEFAULT_TYPES = [
  { code: 'UNIT_TEST', name: 'Unit Test' },
  { code: 'MONTHLY_TEST', name: 'Monthly Test' },
  { code: 'QUARTERLY', name: 'Quarterly Examination' },
  { code: 'HALF_YEARLY', name: 'Half Yearly Examination' },
  { code: 'ANNUAL', name: 'Annual / Final Examination' },
  { code: 'PRE_BOARD', name: 'Pre-Board Examination' },
];

const oid = (id) => new mongoose.Types.ObjectId(String(id));
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function toCode(name) {
  return String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function cleanName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new AppError('Exam type name is required', 400);
  if (name.length > 60) throw new AppError('Exam type name must be 60 characters or fewer', 400);
  return name;
}

class ExamTypeService {
  /**
   * First read for a school creates the default set. A flag on the school
   * (not "count === 0") keeps a school that deleted them all from getting them back.
   */
  async ensureSeeded(schoolId) {
    const claimed = await School.updateOne(
      { _id: oid(schoolId), 'settings.examTypesSeeded': { $ne: true } },
      { $set: { 'settings.examTypesSeeded': true } }
    );
    if (!claimed.modifiedCount) return;
    try {
      await ExamType.insertMany(
        DEFAULT_TYPES.map((t, i) => ({ ...t, schoolId: oid(schoolId), sortOrder: i })),
        { ordered: false }
      );
    } catch (error) {
      if (error?.code !== 11000 && !error?.writeErrors) throw error;
    }
  }

  async list(schoolId, { includeInactive = false } = {}) {
    await this.ensureSeeded(schoolId);
    const filter = { schoolId: oid(schoolId) };
    if (!includeInactive) filter.isActive = true;
    const rows = await ExamType.find(filter).sort({ sortOrder: 1, name: 1 });

    // How many exams use each type — drives the "in use" badge / delete guard.
    const usage = await Exam.aggregate([
      { $match: { schoolId: oid(schoolId) } },
      { $group: { _id: '$examType', count: { $sum: 1 } } },
    ]);
    const used = new Map(usage.map((u) => [u._id, u.count]));
    return rows.map((r) => ({ ...r.toPublicJSON(), examCount: used.get(r.code) || 0 }));
  }

  async create(schoolId, payload = {}) {
    await this.ensureSeeded(schoolId);
    const name = cleanName(payload.name);
    const code = toCode(name);
    if (!code) throw new AppError('Exam type name must contain letters or numbers', 400);

    const clash = await ExamType.findOne({
      schoolId: oid(schoolId),
      $or: [{ code }, { name: new RegExp(`^${escapeRegex(name)}$`, 'i') }],
    });
    if (clash) throw new AppError('An exam type with this name already exists', 409);

    const last = await ExamType.findOne({ schoolId: oid(schoolId) }).sort({ sortOrder: -1 });
    const created = await ExamType.create({
      schoolId: oid(schoolId),
      code,
      name,
      description: typeof payload.description === 'string' ? payload.description.trim() : '',
      sortOrder: (last?.sortOrder ?? -1) + 1,
      isActive: payload.isActive !== false,
    });
    return { ...created.toPublicJSON(), examCount: 0 };
  }

  async update(schoolId, id, payload = {}) {
    const doc = await ExamType.findOne({ _id: oid(id), schoolId: oid(schoolId) });
    if (!doc) throw new AppError('Exam type not found', 404);

    if (payload.name !== undefined) {
      const name = cleanName(payload.name);
      const clash = await ExamType.findOne({
        schoolId: oid(schoolId),
        _id: { $ne: doc._id },
        name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
      });
      if (clash) throw new AppError('An exam type with this name already exists', 409);
      doc.name = name;
    }
    if (payload.description !== undefined) {
      doc.description = typeof payload.description === 'string' ? payload.description.trim() : '';
    }
    if (payload.isActive !== undefined) doc.isActive = Boolean(payload.isActive);
    await doc.save();

    const examCount = await Exam.countDocuments({ schoolId: oid(schoolId), examType: doc.code });
    return { ...doc.toPublicJSON(), examCount };
  }

  async remove(schoolId, id) {
    const doc = await ExamType.findOne({ _id: oid(id), schoolId: oid(schoolId) });
    if (!doc) throw new AppError('Exam type not found', 404);
    const inUse = await Exam.countDocuments({ schoolId: oid(schoolId), examType: doc.code });
    if (inUse > 0) {
      throw new AppError(
        `This exam type is used by ${inUse} exam${inUse === 1 ? '' : 's'}. Deactivate it instead of deleting.`,
        409
      );
    }
    await doc.deleteOne();
    return { message: 'Exam type deleted' };
  }

  /**
   * Normalises + validates the `examType` on an exam payload. `current` is the
   * exam's existing value: keeping it is always allowed (it may belong to a type
   * that was since deactivated or predates this list, e.g. "OTHER").
   */
  async resolveCode(schoolId, value, current = null) {
    const code = String(value ?? '').trim().toUpperCase();
    if (!code) throw new AppError('Exam type is required', 400);
    if (current && code === current) return code;
    await this.ensureSeeded(schoolId);
    const found = await ExamType.findOne({ schoolId: oid(schoolId), code });
    if (!found) throw new AppError('Unknown exam type. Add it under Exam Types first.', 400);
    if (!found.isActive) throw new AppError('This exam type is inactive', 400);
    return code;
  }
}

export const examTypeService = new ExamTypeService();
