import { studentAccessService } from '../../services/studentAccess.service.js';
import { studentDashboardService } from '../../services/studentDashboard.service.js';

async function ctxWithEnrollment(req) {
  const ctx = await studentAccessService.loadContext(req);
  studentAccessService.requireEnrollment(ctx);
  return ctx;
}

export async function getStudentDashboard(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentDashboardService.dashboard(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function getStudentToday(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentDashboardService.today(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function getStudentUpcoming(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentDashboardService.upcoming(ctx) });
  } catch (error) {
    next(error);
  }
}
