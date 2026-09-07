import { studentAccessService } from '../../services/studentAccess.service.js';
import { studentLeaveService } from '../../services/studentLeave.service.js';
import { auditLogService } from '../../services/auditLog.service.js';

async function loadCtx(req) {
  return studentAccessService.loadContext(req);
}

export async function listLeaves(req, res, next) {
  try {
    const { data, pagination } = await studentLeaveService.list(await loadCtx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function getLeave(req, res, next) {
  try {
    res.json({ success: true, data: await studentLeaveService.get(await loadCtx(req), req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function applyLeave(req, res, next) {
  try {
    const data = await studentLeaveService.apply(await loadCtx(req), req.body || {});
    auditLogService.record(req, { module: 'LEAVE', action: 'CREATE', entityType: 'LeaveRequest', entityId: data.id, summary: 'Student applied for leave' });
    res.status(201).json({ success: true, data, message: 'Leave request submitted' });
  } catch (error) {
    next(error);
  }
}

export async function updateLeave(req, res, next) {
  try {
    const data = await studentLeaveService.update(await loadCtx(req), req.params.id, req.body || {});
    res.json({ success: true, data, message: 'Leave request updated' });
  } catch (error) {
    next(error);
  }
}

export async function cancelLeave(req, res, next) {
  try {
    const data = await studentLeaveService.cancel(await loadCtx(req), req.params.id);
    auditLogService.record(req, { module: 'LEAVE', action: 'CANCEL', entityType: 'LeaveRequest', entityId: req.params.id, summary: 'Student cancelled leave' });
    res.json({ success: true, message: data.message });
  } catch (error) {
    next(error);
  }
}
