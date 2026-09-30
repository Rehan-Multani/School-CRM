import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination, safeLinkUrl } from '../../../shared/sanitize.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { Teacher } from '../models/Teacher.js';
import { leaveLite } from '../serializers/teacher.serializers.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const LEAVE_TYPES = ['CASUAL', 'MEDICAL', 'PAID', 'UNPAID', 'MATERNITY', 'PATERNITY', 'OTHER'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LEAVE_DAYS = 366;

function dayCount(start, end) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  return Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
}

class TeacherLeaveService {
  async apply(ctx, payload = {}) {
    const leaveType = String(payload.leaveType || 'CASUAL').toUpperCase();
    if (!LEAVE_TYPES.includes(leaveType)) {
      throw new AppError(`leaveType must be one of ${LEAVE_TYPES.join(', ')}`, 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    const startDate = String(payload.startDate || '').trim();
    const endDate = String(payload.endDate || '').trim();
    if (!ISO_DATE.test(startDate) || !ISO_DATE.test(endDate)) {
      throw new AppError('startDate and endDate must be YYYY-MM-DD', 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    if (endDate < startDate) throw new AppError('endDate cannot be before startDate', 400, TEACHER_ERR.VALIDATION_ERROR);
    const reason = String(payload.reason || '').trim();
    if (!reason) throw new AppError('reason is required', 400, TEACHER_ERR.VALIDATION_ERROR);

    const totalDays = dayCount(startDate, endDate);
    if (!Number.isFinite(totalDays) || totalDays > MAX_LEAVE_DAYS) {
      throw new AppError(`A single leave request can cover at most ${MAX_LEAVE_DAYS} days`, 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    const overlap = await LeaveRequest.exists({
      schoolId: oid(ctx.schoolId),
      employeeRefId: oid(ctx.teacherId),
      status: { $in: ['PENDING', 'APPROVED'] },
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
    });
    if (overlap) {
      throw new AppError('You already have a pending or approved leave for these dates', 409, TEACHER_ERR.LEAVE_OVERLAP);
    }
    const teacher = await Teacher.findOne({ _id: oid(ctx.teacherId), schoolId: oid(ctx.schoolId) }).lean();
    if (!teacher) throw new AppError('Teacher not found', 404, TEACHER_ERR.TEACHER_NOT_FOUND);

    const leave = await LeaveRequest.create({
      schoolId: oid(ctx.schoolId),
      employeeRefId: oid(ctx.teacherId),
      employeeType: 'TEACHER',
      employeeId: teacher.employeeId || `TCH-${String(teacher._id).slice(-4)}`,
      employeeName: teacher.name || 'Teacher',
      department: teacher.department || '',
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason: reason.slice(0, 1000),
      status: 'PENDING',
      documentUrl: safeLinkUrl(payload.documentUrl),
    });
    return leaveLite(leave.toPublicJSON());
  }

  async list(ctx, query = {}) {
    const filter = { schoolId: oid(ctx.schoolId), employeeRefId: oid(ctx.teacherId), employeeType: 'TEACHER' };
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
    const leave = await LeaveRequest.findOne({
      schoolId: oid(ctx.schoolId),
      _id: oid(id),
      employeeRefId: oid(ctx.teacherId),
    });
    if (!leave) throw new AppError('Leave request not found', 404, TEACHER_ERR.NOT_FOUND);
    return leave.toPublicJSON();
  }

  async cancel(ctx, id) {
    const leave = await LeaveRequest.findOne({
      schoolId: oid(ctx.schoolId),
      _id: oid(id),
      employeeRefId: oid(ctx.teacherId),
    });
    if (!leave) throw new AppError('Leave request not found', 404, TEACHER_ERR.NOT_FOUND);
    if (leave.status !== 'PENDING') {
      throw new AppError(`A ${leave.status.toLowerCase()} leave request cannot be cancelled`, 409, TEACHER_ERR.LEAVE_NOT_CANCELLABLE);
    }
    leave.status = 'CANCELLED';
    await leave.save();
    return { message: 'Leave request cancelled' };
  }
}

export const teacherLeaveService = new TeacherLeaveService();
