import { parentAccessService } from '../../services/parentAccess.service.js';
import { studentSelfAttendanceService } from '../../services/studentSelfAttendance.service.js';

async function childCtx(req) {
  const ctx = await parentAccessService.resolveChild(req, req.params.childId);
  parentAccessService.requireEnrollment(ctx);
  return ctx;
}

export async function getSummary(req, res, next) {
  try {
    res.json({ success: true, data: await studentSelfAttendanceService.summary(await childCtx(req)) });
  } catch (e) { next(e); }
}

export async function getDaily(req, res, next) {
  try {
    res.json({ success: true, data: await studentSelfAttendanceService.daily(await childCtx(req), req.query) });
  } catch (e) { next(e); }
}

export async function getMonthly(req, res, next) {
  try {
    res.json({ success: true, data: await studentSelfAttendanceService.monthly(await childCtx(req), req.query) });
  } catch (e) { next(e); }
}
