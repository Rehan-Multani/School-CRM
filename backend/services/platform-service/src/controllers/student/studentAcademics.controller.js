import { studentAccessService } from '../../services/studentAccess.service.js';
import { studentTimetableService } from '../../services/studentTimetable.service.js';
import { studentClassworkService } from '../../services/studentClasswork.service.js';

async function ctxWithEnrollment(req) {
  const ctx = await studentAccessService.loadContext(req);
  studentAccessService.requireEnrollment(ctx);
  return ctx;
}

export async function getTimetableWeek(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentTimetableService.week(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function getTimetableDay(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentTimetableService.day(ctx, req.params.day) });
  } catch (error) {
    next(error);
  }
}

export async function getTimetableToday(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentTimetableService.today(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function listClasswork(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    const { data, pagination } = await studentClassworkService.list(ctx, req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function getClasswork(req, res, next) {
  try {
    const ctx = await ctxWithEnrollment(req);
    res.json({ success: true, data: await studentClassworkService.get(ctx, req.params.id) });
  } catch (error) {
    next(error);
  }
}
