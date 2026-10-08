import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { StudentPickupSession, ACTIVE_PICKUP_STATUSES } from '../models/StudentPickupSession.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';
import { safePickupOtpService } from './safePickupOtp.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/**
 * Read-only pickup visibility for a parent's child. Pickup sessions are still
 * teacher-initiated (see StudentPickupSession + teacherPickup.controller) —
 * parent-initiated requests are deferred (docs/parent-apk-api.md). The guardian
 * mobile is selected only so toPublicJSON can return its MASKED form.
 */
/**
 * The session as the parent sees it. Adds `otp` ONLY while the code is live:
 * status OTP_SENT, not expired, readable copy present. Anything else (verified,
 * completed, cancelled, expired, failed) never carries it.
 */
function parentView(row) {
  const out = row.toPublicJSON();
  const live =
    row.status === 'OTP_SENT' &&
    row.otpCipher &&
    row.otpExpiresAt &&
    new Date(row.otpExpiresAt).getTime() > Date.now();
  if (live) {
    const otp = safePickupOtpService.decryptOtp(row.otpCipher);
    if (otp) out.otp = otp;
  }
  return out;
}

class ParentPickupService {
  async list(childCtx, query = {}) {
    const filter = { schoolId: oid(childCtx.schoolId), studentId: oid(childCtx.studentId) };
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total, active] = await Promise.all([
      StudentPickupSession.find(filter).select('+guardianMobile').sort({ createdAt: -1 }).skip(skip).limit(limit),
      StudentPickupSession.countDocuments(filter),
      StudentPickupSession.findOne({ ...filter, status: { $in: ACTIVE_PICKUP_STATUSES } }).select('+guardianMobile +otpCipher').sort({ createdAt: -1 }),
    ]);
    return {
      data: rows.map((r) => r.toPublicJSON()),
      active: active ? parentView(active) : null,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /**
   * Live pickups for ANY of the parent's children (so the app can alert about a
   * child that is not the one currently selected). Each row is parentView()
   * plus `childId`; `otp` only while it is live. Never cached.
   */
  async activeForParent(parentCtx) {
    const ids = (parentCtx.children || []).map((c) => c.studentId).filter(Boolean);
    if (!ids.length) return [];
    const rows = await StudentPickupSession.find({
      schoolId: oid(parentCtx.schoolId),
      studentId: { $in: ids.map(oid) },
      status: { $in: ACTIVE_PICKUP_STATUSES },
    })
      .select('+guardianMobile +otpCipher')
      .sort({ createdAt: -1 });
    return rows.map((r) => ({ ...parentView(r), childId: String(r.studentId) }));
  }

  async get(childCtx, sessionId) {
    const row = await StudentPickupSession.findOne({
      schoolId: oid(childCtx.schoolId),
      studentId: oid(childCtx.studentId),
      _id: oid(sessionId),
    }).select('+guardianMobile +otpCipher'); // mobile leaves only masked; the OTP only via parentView()
    if (!row) throw new AppError('Pickup session not found', 404, PARENT_ERR.NOT_FOUND);
    return parentView(row);
  }
}

export const parentPickupService = new ParentPickupService();
