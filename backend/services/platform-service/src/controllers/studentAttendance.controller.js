import { studentAttendanceService } from '../services/studentAttendance.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub || req.schoolAdmin?.schoolId;
}
function performedBy(req) {
  return req.user?.name || req.user?.email || 'School Admin';
}

export async function getStudentAttendanceDay(req, res, next) {
  try {
    const data = await studentAttendanceService.getDay(schoolId(req), req.query.sectionId, req.query.date);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function saveStudentAttendanceDay(req, res, next) {
  try {
    const data = await studentAttendanceService.saveDay(schoolId(req), req.body, performedBy(req));
    res.json({ success: true, data, message: 'Attendance saved' });
  } catch (error) {
    next(error);
  }
}

export async function markSingleStudentAttendance(req, res, next) {
  try {
    const data = await studentAttendanceService.markSingle(
      schoolId(req),
      req.params.sectionId,
      req.params.studentId,
      req.body,
      performedBy(req)
    );
    res.json({ success: true, data, message: 'Attendance updated' });
  } catch (error) {
    next(error);
  }
}

export async function markAllStudentAttendance(req, res, next) {
  try {
    const data = await studentAttendanceService.markAll(schoolId(req), req.body, performedBy(req));
    res.json({ success: true, data, message: 'All students marked' });
  } catch (error) {
    next(error);
  }
}

export async function getStudentAttendanceMonitor(req, res, next) {
  try {
    const data = await studentAttendanceService.monitor(schoolId(req), req.query.date);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStudentAttendanceReport(req, res, next) {
  try {
    const data = await studentAttendanceService.report(schoolId(req), req.query.from, req.query.to);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
