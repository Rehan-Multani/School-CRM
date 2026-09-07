import { studentAccessService } from '../../services/studentAccess.service.js';
import { studentSelfAttendanceService } from '../../services/studentSelfAttendance.service.js';

async function ctxWithEnrollment(req) {
  const ctx = await studentAccessService.loadContext(req);
  studentAccessService.requireEnrollment(ctx);
  return ctx;
}

export async function getAttendanceSummary(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentSelfAttendanceService.summary(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceDaily(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentSelfAttendanceService.daily(ctx, req.query) });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceMonthly(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentSelfAttendanceService.monthly(ctx, req.query) });
  } catch (error) {
    next(error);
  }
}
