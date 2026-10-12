import { AppError } from '../../../shared/AppError.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { staffSelfAttendanceService, staffActor } from '../services/staffSelfAttendance.service.js';
import { auditLogService } from '../services/auditLog.service.js';
import { schoolId } from '../utils/tenant.js';

/**
 * Own attendance for the web staff panels (Accountant / HR / Librarian): the
 * person must be inside the radius the School Admin set. Web has no
 * fingerprint reader, so the fingerprint step is skipped on these routes
 * (decided here, not by the request body).
 *
 * Only the signed-in staff account itself can mark - a School Admin / Principal
 * token that is allowed through the panel guard is refused.
 */
export function staffSelfAttendanceHandlers({ role, label, department = '' }) {
  async function loadActor(req) {
    if (String(req.user?.role || '').toUpperCase() !== role) {
      throw new AppError('Only the signed-in staff member can mark their own attendance', 403, 'FORBIDDEN');
    }
    const sid = schoolId(req);
    const uid = req.user?.userId || req.user?.sub;
    const user = await SchoolUser.findOne({ _id: uid, schoolId: sid, role }).lean();
    if (!user) throw new AppError('Staff account not found', 404, 'NOT_FOUND');
    return staffActor(sid, user, { label, role: label, department });
  }

  const today = async (req, res, next) => {
    try {
      res.json({ success: true, data: await staffSelfAttendanceService.today(await loadActor(req)) });
    } catch (error) {
      next(error);
    }
  };

  const checkIn = async (req, res, next) => {
    try {
      const actor = await loadActor(req);
      const data = await staffSelfAttendanceService.checkIn(actor, req.body || {}, { skipBiometric: true });
      if (!data.alreadyDone) {
        auditLogService.record(req, {
          module: 'ATTENDANCE',
          action: 'SELF_CHECK_IN',
          entityType: 'StaffAttendance',
          entityId: data.record?.id,
          summary: `${label} ${actor.name} marked present from the web panel (${data.record?.distanceMeters ?? '?'} m from school)`,
        });
      }
      res.json({
        success: true,
        data,
        message: data.alreadyDone ? 'Already marked present today' : 'Marked present',
      });
    } catch (error) {
      next(error);
    }
  };

  return { today, checkIn };
}
