import mongoose from 'mongoose';
import { Admission } from '../models/Admission.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

class AdmissionRepository {
  async list(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status && query.status !== 'ALL') filter.status = String(query.status).toUpperCase();
    if (query.appliedClassId) filter.appliedClassId = query.appliedClassId;
    if (query.source && query.source !== 'ALL') filter.source = String(query.source).toUpperCase();
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [
        { applicantName: regex },
        { guardianName: regex },
        { phone: regex },
        { email: regex },
        { admissionNo: regex },
      ];
    }

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 100,
      maxLimit: 500,
    });

    const [items, total] = await Promise.all([
      Admission.find(filter).sort({ appliedDate: -1 }).skip(skip).limit(limit),
      Admission.countDocuments(filter),
    ]);

    return { items: items.map((i) => i.toPublicJSON()), total, page, limit };
  }

  async findById(schoolId, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Admission.findOne({ schoolId, _id: id });
  }

  async findDuplicate(schoolId, { phone, email }, excludeId) {
    const or = [];
    if (phone) or.push({ phone: phone.trim() });
    if (email) or.push({ email: email.trim().toLowerCase() });
    if (!or.length) return null;
    const filter = { schoolId, $or: or, status: { $ne: 'REJECTED' } };
    if (excludeId) filter._id = { $ne: excludeId };
    return Admission.findOne(filter);
  }

  async create(schoolId, data) {
    return Admission.create({ ...data, schoolId });
  }

  async update(schoolId, id, data) {
    return Admission.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  async remove(schoolId, id) {
    return Admission.findOneAndDelete({ schoolId, _id: id });
  }

  async stats(schoolId) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const agg = await Admission.aggregate([
      { $match: { schoolId: sId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const stats = {
      total: 0,
      pending: 0,
      waiting: 0,
      approved: 0,
      rejected: 0,
      enrolled: 0,
    };
    const map = {
      PENDING_REVIEW: 'pending',
      WAITING_LIST: 'waiting',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      ENROLLED: 'enrolled',
    };
    agg.forEach((a) => {
      stats.total += a.count;
      const key = map[a._id];
      if (key) stats[key] = a.count;
    });
    return stats;
  }

  async countByClassThisYear(schoolId, classNamePrefix) {
    // best-effort trend helper — count enrolled admissions
    return Admission.countDocuments({ schoolId, status: 'ENROLLED' });
  }
}

export const admissionRepository = new AdmissionRepository();
