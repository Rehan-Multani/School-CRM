import { certificateService } from '../services/certificate.service.js';
import { idCardService } from '../services/idCard.service.js';
import { schoolId, performedBy } from '../utils/tenant.js';
import { sendSuccess } from '../../../shared/response.js';

const wrap = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    next(error);
  }
};

// School branding + year/class/section tree (same data the ID card page uses).
export const certificateOptions = wrap(async (req, res) => {
  const data = await idCardService.options(schoolId(req));
  sendSuccess(res, data, 'Certificate options retrieved successfully');
});

export const listTemplates = wrap(async (req, res) => {
  const data = await certificateService.listTemplates(schoolId(req), req.query);
  sendSuccess(res, data, 'Templates retrieved successfully');
});

export const createTemplate = wrap(async (req, res) => {
  const data = await certificateService.createTemplate(schoolId(req), req.body, performedBy(req));
  sendSuccess(res, data, 'Certificate template created', 201);
});

export const updateTemplate = wrap(async (req, res) => {
  const data = await certificateService.updateTemplate(schoolId(req), req.params.id, req.body, performedBy(req));
  sendSuccess(res, data, 'Certificate template updated');
});

export const deleteTemplate = wrap(async (req, res) => {
  const data = await certificateService.deleteTemplate(schoolId(req), req.params.id);
  sendSuccess(res, data, 'Certificate template deleted');
});

export const certificateRecipients = wrap(async (req, res) => {
  const result = await certificateService.recipients(schoolId(req), req.query);
  res.json({ success: true, ...result });
});

export const issueCertificates = wrap(async (req, res) => {
  const data = await certificateService.issue(schoolId(req), req.body, performedBy(req));
  sendSuccess(res, data, `${data.issued.length} certificate(s) issued`, 201);
});

// Live data for timetable / fee-structure designs (same guard as the rest: Admin, Principal, HR).
export const timetableData = wrap(async (req, res) => {
  const data = await certificateService.timetableData(schoolId(req), req.query.sectionId);
  sendSuccess(res, data, 'Timetable retrieved successfully');
});

export const feeStructureData = wrap(async (req, res) => {
  const data = await certificateService.feeStructureData(schoolId(req), req.query.classId, req.query.academicYearId);
  sendSuccess(res, data, 'Fee structure retrieved successfully');
});

export const listIssued = wrap(async (req, res) => {
  const result = await certificateService.listIssued(schoolId(req), req.query);
  res.json({ success: true, ...result });
});

export const getIssuedMany = wrap(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').filter(Boolean);
  const data = await certificateService.getIssuedMany(schoolId(req), ids);
  sendSuccess(res, data, 'Certificates retrieved successfully');
});

export const revokeCertificate = wrap(async (req, res) => {
  const data = await certificateService.revoke(schoolId(req), req.params.id, req.body?.reason, performedBy(req));
  sendSuccess(res, data, 'Certificate revoked');
});

export const reinstateCertificate = wrap(async (req, res) => {
  const data = await certificateService.reinstate(schoolId(req), req.params.id);
  sendSuccess(res, data, 'Certificate reinstated');
});

// Public (no login): backs the QR code.
export const verifyCertificate = wrap(async (req, res) => {
  const data = await certificateService.verify(req.params.code);
  sendSuccess(res, data, 'Certificate verified');
});
