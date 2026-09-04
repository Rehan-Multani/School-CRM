import { admissionService } from '../services/admission.service.js';
import { auditLogService } from '../services/auditLog.service.js';

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

export async function listAdmissions(req, res, next) {
  try {
    const result = await admissionService.list(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getAdmissionStats(req, res, next) {
  try {
    const data = await admissionService.stats(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getAdmission(req, res, next) {
  try {
    const data = await admissionService.get(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createAdmission(req, res, next) {
  try {
    const data = await admissionService.create(schoolId(req), req.body, performedBy(req));
    auditLogService.record(req, { module: 'ADMISSIONS', action: 'CREATE', entityType: 'Admission', entityId: data.id, summary: `Registered application for ${data.applicantName}` });
    res.status(201).json({ success: true, data, message: `Application for ${data.applicantName} registered` });
  } catch (error) {
    next(error);
  }
}

export async function updateAdmission(req, res, next) {
  try {
    const data = await admissionService.update(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Application updated' });
  } catch (error) {
    next(error);
  }
}

export async function updateAdmissionStatus(req, res, next) {
  try {
    const data = await admissionService.setStatus(
      schoolId(req),
      req.params.id,
      req.body?.status,
      req.body?.reason,
      performedBy(req)
    );
    auditLogService.record(req, { module: 'ADMISSIONS', action: 'STATUS', entityType: 'Admission', entityId: req.params.id, summary: `Moved ${data.applicantName} to ${data.status}` });
    res.json({ success: true, data, message: `Application moved to ${data.status.replace('_', ' ').toLowerCase()}` });
  } catch (error) {
    next(error);
  }
}

export async function approveAdmission(req, res, next) {
  try {
    const result = await admissionService.approve(schoolId(req), req.params.id, req.body, performedBy(req));
    auditLogService.record(req, {
      module: 'ADMISSIONS',
      action: result.alreadyEnrolled ? 'APPROVE_NOOP' : 'APPROVE',
      entityType: 'Admission',
      entityId: req.params.id,
      summary: result.alreadyEnrolled
        ? 'Re-approve (already enrolled)'
        : `Approved admission — Student ${result.student?.id || ''} / ${result.admission?.admissionNo || ''}`,
    });
    res.json({
      success: true,
      data: result,
      message: result.alreadyEnrolled
        ? 'Applicant already enrolled'
        : `Admission approved — Student ID ${result.student?.id || ''} / ${result.admission.admissionNo}`,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdmission(req, res, next) {
  try {
    const result = await admissionService.remove(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
