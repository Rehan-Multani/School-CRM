import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination, escapeRegex } from '../../../shared/sanitize.js';
import { Visitor } from '../models/Visitor.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const str = (v) => (typeof v === 'string' ? v.trim() : '');

function clean(body = {}, { partial = false } = {}) {
  const out = {};
  const need = (key, label, max) => {
    if (partial && body[key] === undefined) return;
    const v = str(body[key]);
    if (!v) throw new AppError(`${label} is required`, 400, 'VALIDATION_ERROR');
    if (v.length > max) throw new AppError(`${label} is too long`, 400, 'VALIDATION_ERROR');
    out[key] = v;
  };
  need('name', 'Visitor name', 120);
  need('mobile', 'Mobile number', 20);
  need('purpose', 'Purpose of visit', 300);
  if (out.mobile && !/^[+\d][\d\s-]{6,18}$/.test(out.mobile)) {
    throw new AppError('Enter a valid mobile number', 400, 'VALIDATION_ERROR');
  }
  for (const [key, max] of [['personToMeet', 120], ['remarks', 500]]) {
    if (body[key] !== undefined) {
      const v = str(body[key]);
      if (v.length > max) throw new AppError(`${key} is too long`, 400, 'VALIDATION_ERROR');
      out[key] = v;
    }
  }
  if (body.visitDate !== undefined && body.visitDate !== '') {
    const d = new Date(body.visitDate);
    if (Number.isNaN(d.getTime())) throw new AppError('Invalid visit date', 400, 'VALIDATION_ERROR');
    out.visitDate = d;
  }
  return out;
}

class VisitorService {
  async list(schoolId, query = {}) {
    const filter = { schoolId: oid(schoolId) };
    const q = str(query.search || query.q);
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { mobile: rx }, { purpose: rx }, { personToMeet: rx }];
    }
    if (query.from || query.to) {
      filter.visitDate = {};
      if (query.from) filter.visitDate.$gte = new Date(`${String(query.from).slice(0, 10)}T00:00:00`);
      if (query.to) filter.visitDate.$lte = new Date(`${String(query.to).slice(0, 10)}T23:59:59.999`);
    }
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 100 });
    const [rows, total] = await Promise.all([
      Visitor.find(filter).sort({ visitDate: -1, _id: -1 }).skip(skip).limit(limit),
      Visitor.countDocuments(filter),
    ]);
    return {
      data: rows.map((r) => r.toPublicJSON()),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async create(schoolId, body, by) {
    const row = await Visitor.create({ ...clean(body), schoolId: oid(schoolId), createdBy: by || '' });
    return row.toPublicJSON();
  }

  async update(schoolId, id, body) {
    const row = await Visitor.findOneAndUpdate(
      { _id: oid(id), schoolId: oid(schoolId) },
      { $set: clean(body, { partial: true }) },
      { new: true }
    );
    if (!row) throw new AppError('Visitor not found', 404, 'NOT_FOUND');
    return row.toPublicJSON();
  }

  async remove(schoolId, id) {
    const row = await Visitor.findOneAndDelete({ _id: oid(id), schoolId: oid(schoolId) });
    if (!row) throw new AppError('Visitor not found', 404, 'NOT_FOUND');
    return { id: String(id) };
  }
}

export const visitorService = new VisitorService();
