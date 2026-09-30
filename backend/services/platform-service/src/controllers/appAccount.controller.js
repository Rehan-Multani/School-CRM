import { deleteAppAccount } from '../services/appAccount.service.js';
import { auditLogService } from '../services/auditLog.service.js';
import { Driver } from '../models/Driver.js';
import { schoolId, studentId, parentId, driverId } from '../utils/tenant.js';

// `POST {prefix}/account/delete { password }` for the student / parent /
// driver apps (teacher has its own controller). See appAccount.service.js.
function deleteHandler(role, idOf, entityType) {
  return async function deleteAccount(req, res, next) {
    try {
      const id = idOf(req);
      const data = await deleteAppAccount(role, schoolId(req), id, req.body || {});
      auditLogService.record(req, { module: 'AUTH', action: 'ACCOUNT_DELETE', entityType, entityId: id, summary: `${entityType} deleted their app account` });
      res.json({ success: true, message: data.message });
    } catch (error) {
      next(error);
    }
  };
}

export const studentDeleteAccount = deleteHandler('STUDENT', studentId, 'Student');
export const parentDeleteAccount = deleteHandler('PARENT', parentId, 'Parent');
export const driverDeleteAccount = deleteHandler('DRIVER', driverId, 'Driver');

// Driver had no logout; now that driver tokens are revocable, give it one
// (ends every driver session, same as the other roles).
export async function driverLogout(req, res, next) {
  try {
    await Driver.updateOne({ _id: driverId(req), schoolId: schoolId(req) }, { $inc: { tokenVersion: 1 } });
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}
