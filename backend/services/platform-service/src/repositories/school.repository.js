import mongoose from 'mongoose';
import { School } from '../models/School.js';

export class SchoolRepository {
  async list({ search, status, plan, page = 1, limit = 5 }) {
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { schoolId: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
      ];
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (plan && plan !== 'All') {
      query.subscriptionPlan = plan;
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 5));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      School.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      School.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  create(payload) {
    return School.create(payload);
  }

  findById(id) {
    if (!id) return null;
    if (mongoose.isValidObjectId(id)) {
      return School.findById(id);
    }
    return School.findOne({ $or: [{ schoolId: id }, { code: id }] });
  }

  findByIdWithPassword(id) {
    if (!id) return null;
    const query = mongoose.isValidObjectId(id)
      ? { _id: id }
      : { $or: [{ schoolId: id }, { code: id }] };
    return School.findOne(query).select(
      '+admin.passwordHash +admin.resetPasswordTokenHash +admin.resetPasswordExpiresAt +settings.smtp.pass'
    );
  }

  findByAdminEmail(email) {
    return School.findOne({ 'admin.email': email }).select(
      '+admin.passwordHash +admin.resetPasswordTokenHash +admin.resetPasswordExpiresAt'
    );
  }

  findByResetTokenHash(tokenHash) {
    return School.findOne({
      'admin.resetPasswordTokenHash': tokenHash,
      'admin.resetPasswordExpiresAt': { $gt: new Date() },
    }).select('+admin.passwordHash +admin.resetPasswordTokenHash +admin.resetPasswordExpiresAt');
  }

  updateStatus(id, status) {
    return School.findByIdAndUpdate(id, { status }, { new: true });
  }

  updateById(id, payload) {
    if (!id) return null;
    const query = mongoose.isValidObjectId(id)
      ? { _id: id }
      : { $or: [{ schoolId: id }, { code: id }] };
    return School.findOneAndUpdate(query, payload, { new: true, runValidators: true });
  }

  deleteById(id) {
    return School.findByIdAndDelete(id);
  }
}

export const schoolRepository = new SchoolRepository();
