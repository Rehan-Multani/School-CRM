import { visitorService } from '../services/visitor.service.js';
import { auditLogService } from '../services/auditLog.service.js';
import { AppError } from '../../../shared/AppError.js';
import { schoolId, performedBy } from '../utils/tenant.js';
import { sendSuccess } from '../../../shared/response.js';

const wrap = (handler) => async (req, res, next) => {
  try {
    await handler(req, res);
  } catch (error) {
    next(error);
  }
};

// HR records visitors; School Admin and Principal can only read the list.
function assertHr(req) {
  if (String(req.user?.role || '').toUpperCase() !== 'HR') {
    throw new AppError('Only HR can add or change visitor records', 403, 'FORBIDDEN');
  }
}

const audit = (req, action, id, summary) =>
  auditLogService.record(req, { module: 'VISITORS', action, entityType: 'Visitor', entityId: String(id || ''), summary });

export const listVisitors = wrap(async (req, res) => {
  const result = await visitorService.list(schoolId(req), req.query);
  res.json({ success: true, ...result });
});

export const createVisitor = wrap(async (req, res) => {
  assertHr(req);
  const data = await visitorService.create(schoolId(req), req.body, performedBy(req));
  audit(req, 'VISITOR_ADDED', data.id, `Visitor added — ${data.name} (${data.purpose})`);
  sendSuccess(res, data, 'Visitor added', 201);
});

export const updateVisitor = wrap(async (req, res) => {
  assertHr(req);
  const data = await visitorService.update(schoolId(req), req.params.id, req.body);
  audit(req, 'VISITOR_UPDATED', data.id, `Visitor updated — ${data.name}`);
  sendSuccess(res, data, 'Visitor updated');
});

export const deleteVisitor = wrap(async (req, res) => {
  assertHr(req);
  const data = await visitorService.remove(schoolId(req), req.params.id);
  audit(req, 'VISITOR_DELETED', data.id, 'Visitor record deleted');
  sendSuccess(res, data, 'Visitor deleted');
});
