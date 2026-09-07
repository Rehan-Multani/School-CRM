import { teacherAccessService } from '../../services/teacherAccess.service.js';
import { teacherDashboardService } from '../../services/teacherDashboard.service.js';
import { teacherTimetableService } from '../../services/teacherTimetable.service.js';

export async function getTeacherDashboard(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherDashboardService.dashboard(ctx);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherTodaySchedule(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherDashboardService.todaySchedule(ctx);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherTimetable(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherTimetableService.week(ctx);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherTimetableDay(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherTimetableService.day(ctx, req.params.day);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherScheduleEntry(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    const data = await teacherTimetableService.entry(ctx, req.params.scheduleId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
