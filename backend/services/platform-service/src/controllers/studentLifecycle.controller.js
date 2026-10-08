import { studentLifecycleService } from '../services/studentLifecycle.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') return req.user?.sub;
  return req.user?.schoolId || req.user?.sub;
}

function isTruthy(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

// 409s from the lifecycle service carry `details` (pending amount, clashing
// student ids) that the UI needs to offer "force" / show who clashed.
function sendConflict(res, error) {
  res.status(error.statusCode || 409).json({ success: false, message: error.message, code: error.code, ...error.details });
}

export async function promotionPreview(req, res, next) {
  try {
    const data = await studentLifecycleService.promotionPreview(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function promoteStudents(req, res, next) {
  try {
    const data = await studentLifecycleService.promote(schoolId(req), req.body || {});
    res.json({ success: true, data, message: `${data.promoted} student(s) promoted` });
  } catch (error) {
    if (error?.details) return sendConflict(res, error);
    next(error);
  }
}

export async function transferStudent(req, res, next) {
  try {
    const data = await studentLifecycleService.transfer(schoolId(req), req.params.id, req.body || {});
    res.json({ success: true, data, message: 'Student marked as left' });
  } catch (error) {
    if (error?.details) return sendConflict(res, error);
    next(error);
  }
}

export async function reactivateStudent(req, res, next) {
  try {
    const data = await studentLifecycleService.reactivate(schoolId(req), req.params.id);
    res.json({ success: true, data, message: 'Student reactivated' });
  } catch (error) {
    next(error);
  }
}

export async function getTransferCertificate(req, res, next) {
  try {
    const data = await studentLifecycleService.transferCertificate(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export function downloadImportTemplate(req, res) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students-import-template.csv"');
  res.send(studentLifecycleService.importTemplate());
}

export async function importStudentsCsv(req, res, next) {
  try {
    const data = await studentLifecycleService.importCsv(schoolId(req), {
      academicYearId: req.body?.academicYearId,
      buffer: req.file?.buffer,
      dryRun: isTruthy(req.query.dryRun),
    });
    res.json({
      success: true,
      data,
      message: data.dryRun
        ? `${data.valid} valid row(s), ${data.failed.length} with errors`
        : `${data.imported} student(s) imported, ${data.failed.length} failed`,
    });
  } catch (error) {
    next(error);
  }
}
