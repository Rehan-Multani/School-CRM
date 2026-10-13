import { studentEnquiryService } from '../services/studentEnquiry.service.js';
import { auditLogService } from '../services/auditLog.service.js';
import { schoolId } from '../utils/tenant.js';
import { sendSuccess } from '../../../shared/response.js';

const wrap = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    next(error);
  }
};

const audit = (req, action, id, summary) =>
  auditLogService.record(req, { module: 'STUDENT_ENQUIRY', action, entityType: 'StudentEnquiry', entityId: String(id || ''), summary });

// Staff side: School Admin, Principal and HR all read and work the list (requireHR admits all three).
export const listEnquiries = wrap(async (req, res) => {
  const result = await studentEnquiryService.list(schoolId(req), req.query);
  res.json({ success: true, ...result });
});

export const updateEnquiry = wrap(async (req, res) => {
  const data = await studentEnquiryService.update(schoolId(req), req.params.id, req.body);
  audit(req, 'ENQUIRY_UPDATED', data.id, `Enquiry for ${data.studentName || 'student'} marked ${data.status}`);
  sendSuccess(res, data, 'Enquiry updated');
});

export const deleteEnquiry = wrap(async (req, res) => {
  const data = await studentEnquiryService.remove(schoolId(req), req.params.id);
  audit(req, 'ENQUIRY_DELETED', data.id, 'Student enquiry deleted');
  sendSuccess(res, data, 'Enquiry deleted');
});

export const getEnquiryForm = wrap(async (req, res) => {
  const id = schoolId(req);
  const [config, share] = await Promise.all([studentEnquiryService.getConfig(id), studentEnquiryService.shareInfo(id)]);
  sendSuccess(res, { ...config, ...share });
});

export const saveEnquiryForm = wrap(async (req, res) => {
  const config = await studentEnquiryService.saveConfig(schoolId(req), req.body);
  audit(req, 'ENQUIRY_FORM_UPDATED', '', 'Student enquiry form settings updated');
  sendSuccess(res, config, 'Enquiry form saved');
});

// Public (no login): the parent opens the school's link, fills the form, submits.
export const publicEnquiryForm = wrap(async (req, res) => {
  const data = await studentEnquiryService.publicForm(req.params.schoolId);
  sendSuccess(res, data);
});

export const submitPublicEnquiry = wrap(async (req, res) => {
  // Hidden "website" input: people never fill it, bots do. Pretend it worked.
  if (req.body && typeof req.body.website === 'string' && req.body.website.trim()) {
    return sendSuccess(res, { message: 'Thank you! Your enquiry has been received.' }, 'Submitted', 201);
  }
  const data = await studentEnquiryService.submit(req.params.schoolId, req.body?.answers);
  sendSuccess(res, data, 'Submitted', 201);
});
