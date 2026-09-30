import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination, safeLinkUrl } from '../../../shared/sanitize.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { leaveLite } from '../serializers/student.serializers.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const LEAVE_TYPES = ['CASUAL', 'MEDICAL', 'PAID', 'UNPAID', 'OTHER'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LEAVE_DAYS = 366;

function dayCount(start, end) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  return Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
}

function validatePayload(payload) {
  const leaveType = String(payload.leaveType || 'OTHER').toUpperCase();
  if (!LEAVE_TYPES.includes(leaveType)) {
    throw new AppError(`leaveType must be one of ${LEAVE_TYPES.join(', ')}`, 400, STUDENT_ERR.VALIDATION_ERROR);
  }
  const startDate = String(payload.startDate || '').trim();
  const endDate = String(payload.endDate || '').trim();
  if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
    throw new AppError('startDate and endDate must be YYYY-MM-DD', 400, STUDENT_ERR.VALIDATION_ERROR);
  }
  if (endDate < startDate) {
    throw new AppError('endDate cannot be before startDate', 400, STUDENT_ERR.VALIDATION_ERROR);
  }
  const totalDays = dayCount(startDate, endDate);
  if (!Number.isFinite(totalDays) || totalDays > MAX_LEAVE_DAYS) {
    throw new AppError(`A single leave request can cover at most ${MAX_LEAVE_DAYS} days`, 400, STUDENT_ERR.VALIDATION_ERROR);
  }
  const reason = String(payload.reason || '').trim();
  if (!reason) throw new AppError('reason is required', 400, STUDENT_ERR.VALIDATION_ERROR);
  return { leaveType, startDate, endDate, reason: reason.slice(0, 1000), totalDays };
}

class StudentLeaveService {
  #ownFilter(ctx) {
    return { schoolId: oid(ctx.schoolId), employeeType: 'STUDENT', employeeRefId: oid(ctx.studentId) };
  }

  /** A pending/approved leave of mine that shares at least one day with [start,end]. */
  async #assertNoOverlap(ctx, { startDate, endDate }, exceptId = null) {
    const filter = {
      ...this.#ownFilter(ctx),
      status: { $in: ['PENDING', 'APPROVED'] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    };
    if (exceptId) filter._id = { $ne: oid(exceptId) };
    if (await LeaveRequest.exists(filter)) {
      throw new AppError('You already have a pending or approved leave for these dates', 409, STUDENT_ERR.LEAVE_OVERLAP);
    }
  }

  async apply(ctx, payload = {}) {
    const v = validatePayload(payload);
    await this.#assertNoOverlap(ctx, v);
    const name = [ctx.student?.firstName, ctx.student?.lastName].filter(Boolean).join(' ').trim() || 'Student';
    const leave = await LeaveRequest.create({
      schoolId: oid(ctx.schoolId),
      employeeRefId: oid(ctx.studentId),
      employeeType: 'STUDENT',
      employeeId: ctx.admissionNumber || `STU-${ctx.studentId.slice(-4)}`,
      employeeName: name,
      department: [ctx.className, ctx.sectionName].filter(Boolean).join(' - '),
      classId: ctx.classId ? oid(ctx.classId) : null,
      className: ctx.className || '',
      sectionId: ctx.sectionId ? oid(ctx.sectionId) : null,
      sectionName: ctx.sectionName || '',
      rollNumber: ctx.rollNumber || '',
      leaveType: v.leaveType,
      startDate: v.startDate,
      endDate: v.endDate,
      totalDays: v.totalDays,
      reason: v.reason,
      status: 'PENDING',
      documentUrl: safeLinkUrl(payload.documentUrl),
    });
    return leaveLite(leave.toPublicJSON());
  }

  async list(ctx, query = {}) {
    const filter = this.#ownFilter(ctx);
    if (query.status) filter.status = String(query.status).toUpperCase().slice(0, 20);
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      LeaveRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      LeaveRequest.countDocuments(filter),
    ]);
    return {
      data: rows.map((r) => leaveLite(r.toPublicJSON())),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async get(ctx, id) {
    const leave = await LeaveRequest.findOne({ ...this.#ownFilter(ctx), _id: oid(id) });
    if (!leave) throw new AppError('Leave request not found', 404, STUDENT_ERR.NOT_FOUND);
    return leaveLite(leave.toPublicJSON());
  }

  async update(ctx, id, payload = {}) {
    const leave = await LeaveRequest.findOne({ ...this.#ownFilter(ctx), _id: oid(id) });
    if (!leave) throw new AppError('Leave request not found', 404, STUDENT_ERR.NOT_FOUND);
    if (leave.status !== 'PENDING') {
      throw new AppError(`A ${leave.status.toLowerCase()} leave request cannot be edited`, 409, STUDENT_ERR.LEAVE_NOT_EDITABLE);
    }
    const v = validatePayload({
      leaveType: payload.leaveType ?? leave.leaveType,
      startDate: payload.startDate ?? leave.startDate,
      endDate: payload.endDate ?? leave.endDate,
      reason: payload.reason ?? leave.reason,
    });
    await this.#assertNoOverlap(ctx, v, leave._id);
    leave.leaveType = v.leaveType;
    leave.startDate = v.startDate;
    leave.endDate = v.endDate;
    leave.totalDays = v.totalDays;
    leave.reason = v.reason;
    if (payload.documentUrl !== undefined) leave.documentUrl = safeLinkUrl(payload.documentUrl);
    await leave.save();
    return leaveLite(leave.toPublicJSON());
  }

  async cancel(ctx, id) {
    const leave = await LeaveRequest.findOne({ ...this.#ownFilter(ctx), _id: oid(id) });
    if (!leave) throw new AppError('Leave request not found', 404, STUDENT_ERR.NOT_FOUND);
    if (leave.status !== 'PENDING') {
      throw new AppError(`A ${leave.status.toLowerCase()} leave request cannot be cancelled`, 409, STUDENT_ERR.LEAVE_NOT_CANCELLABLE);
    }
    leave.status = 'CANCELLED';
    await leave.save();
    return { message: 'Leave request cancelled' };
  }
}

export const studentLeaveService = new StudentLeaveService();
