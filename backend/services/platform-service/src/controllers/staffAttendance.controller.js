import { staffAttendanceService } from '../services/staffAttendance.service.js';

function schoolId(req) {
  return req.user?.sub;
}

export async function getDailyAttendance(req, res, next) {
  try {
    const result = await staffAttendanceService.getDailyAttendance(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.items,
      stats: result.stats,
      date: result.date,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveDailyAttendance(req, res, next) {
  try {
    const result = await staffAttendanceService.saveDailyAttendance(schoolId(req), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateSingleStatus(req, res, next) {
  try {
    const data = await staffAttendanceService.updateSingleStatus(
      schoolId(req),
      req.params.employeeRefId,
      req.body
    );
    res.json({
      success: true,
      data,
      message: `Attendance updated for ${data.employeeName}`,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllStatus(req, res, next) {
  try {
    const result = await staffAttendanceService.markAllStatus(schoolId(req), req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMonthlySummary(req, res, next) {
  try {
    const result = await staffAttendanceService.getMonthlySummary(schoolId(req), req.query);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceReport(req, res, next) {
  try {
    const result = await staffAttendanceService.getAttendanceReport(schoolId(req), req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
