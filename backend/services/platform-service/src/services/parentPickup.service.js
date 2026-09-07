import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { StudentPickupSession, ACTIVE_PICKUP_STATUSES } from '../models/StudentPickupSession.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/**
 * Read-only pickup visibility for a parent's child. Pickup sessions are still
 * teacher-initiated (see StudentPickupSession + teacherPickup.controller) —
 * parent-initiated requests are deferred (docs/parent-apk-api.md). Mobile
 * numbers are masked by the model's toPublicJSON.
 */
class ParentPickupService {
  async list(childCtx, query = {}) {
    const filter = { schoolId: oid(childCtx.schoolId), studentId: oid(childCtx.studentId) };
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total, active] = await Promise.all([
      StudentPickupSession.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StudentPickupSession.countDocuments(filter),
      StudentPickupSession.findOne({ ...filter, status: { $in: ACTIVE_PICKUP_STATUSES } }).sort({ createdAt: -1 }),
    ]);
    return {
      data: rows.map((r) => r.toPublicJSON()),
      active: active ? active.toPublicJSON() : null,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async get(childCtx, sessionId) {
    const row = await StudentPickupSession.findOne({
      schoolId: oid(childCtx.schoolId),
      studentId: oid(childCtx.studentId),
      _id: oid(sessionId),
    });
    if (!row) throw new AppError('Pickup session not found', 404, PARENT_ERR.NOT_FOUND);
    return row.toPublicJSON();
  }
}

export const parentPickupService = new ParentPickupService();
