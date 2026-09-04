import { auditLogService } from '../services/auditLog.service.js';
import { schoolId, performedBy } from '../utils/tenant.js';

export async function listAuditLogs(req, res, next) {
  try {
    const result = await auditLogService.list(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
