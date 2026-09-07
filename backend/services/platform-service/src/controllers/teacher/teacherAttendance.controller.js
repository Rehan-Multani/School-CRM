import { teacherAccessService } from '../../services/teacherAccess.service.js';
import { teacherAttendanceService } from '../../services/teacherAttendance.service.js';
import { performedBy } from '../../utils/tenant.js';
import { auditLogService } from '../../services/auditLog.service.js';

export async function getAttendanceToday(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const sectionId = req.query.sectionId;
    if (!sectionId) return res.status(400).json({ success: false, message: 'sectionId query param is required', code: 'VALIDATION_ERROR' });
    const data = req.query.date
      ? await teacherAttendanceService.forDate(ctx, sectionId, req.query.date)
      : await teacherAttendanceService.today(ctx, sectionId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function submitAttendance(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherAttendanceService.submit(ctx, req.body || {}, performedBy(req));
    auditLogService.record(req, {
      module: 'ATTENDANCE',
      action: 'SUBMIT',
      entityType: 'StudentAttendance',
      entityId: data.id,
      summary: `Marked attendance for ${data.sectionName || 'section'} on ${data.date}`,
    });
    res.json({ success: true, data, message: 'Attendance saved' });
  } catch (error) {
    next(error);
  }
}

export async function patchAttendance(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherAttendanceService.patchDay(ctx, req.params.attendanceId, req.body || {}, performedBy(req));
    auditLogService.record(req, {
      module: 'ATTENDANCE',
      action: 'MODIFY',
      entityType: 'StudentAttendance',
      entityId: data.id,
      summary: `Edited attendance ${data.id}`,
    });
    res.json({ success: true, data, message: 'Attendance updated' });
  } catch (error) {
    next(error);
  }
}

export async function finalizeAttendance(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherAttendanceService.finalize(ctx, req.params.attendanceId);
    auditLogService.record(req, {
      module: 'ATTENDANCE',
      action: 'FINALIZE',
      entityType: 'StudentAttendance',
      entityId: data.id,
      summary: `Finalized attendance ${data.id}`,
    });
    res.json({ success: true, data, message: 'Attendance finalized' });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceHistory(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const result = await teacherAttendanceService.history(ctx, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getSectionAttendance(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const result = await teacherAttendanceService.sectionHistory(ctx, req.params.sectionId, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getStudentAttendance(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherAttendanceService.studentLog(ctx, req.params.studentId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceSummary(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    if (!req.query.sectionId) return res.status(400).json({ success: false, message: 'sectionId query param is required', code: 'VALIDATION_ERROR' });
    const data = await teacherAttendanceService.summary(ctx, req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
