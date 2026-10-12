import { AppError } from '../../../shared/AppError.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { staffSelfAttendanceService, transportManagerActor } from '../services/staffSelfAttendance.service.js';
import { auditLogService } from '../services/auditLog.service.js';
import { schoolId, transportManagerId } from '../utils/tenant.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

/**
 * Transport manager marks themselves present: same rules as the teacher flow
 * (school radius set by the admin + fingerprint). Identity comes only from the
 * verified JWT; the school coordinates never leave the server.
 */
async function loadActor(req) {
  const sid = schoolId(req);
  const user = await SchoolUser.findOne({ _id: transportManagerId(req), schoolId: sid, role: 'TRANSPORT' }).lean();
  if (!user) throw new AppError('Transport manager not found', 404, TRANSPORT_ERR.UNAUTHORIZED);
  return transportManagerActor(sid, user);
}

export async function getManagerSelfAttendanceToday(req, res, next) {
  try {
    res.json({ success: true, data: await staffSelfAttendanceService.today(await loadActor(req)) });
  } catch (error) {
    next(error);
  }
}

function handler(kind) {
  return async (req, res, next) => {
    try {
      const actor = await loadActor(req);
      const body = req.body || {};
      const data =
        kind === 'in'
          ? await staffSelfAttendanceService.checkIn(actor, body)
          : await staffSelfAttendanceService.checkOut(actor, body);
      if (!data.alreadyDone) {
        auditLogService.record(req, {
          module: 'ATTENDANCE',
          action: kind === 'in' ? 'SELF_CHECK_IN' : 'SELF_CHECK_OUT',
          entityType: 'StaffAttendance',
          entityId: data.record?.id,
          summary: `Transport manager ${actor.name} ${kind === 'in' ? 'marked present' : 'checked out'} from the app (${data.record?.distanceMeters ?? '?'} m from school)`,
        });
      }
      res.json({
        success: true,
        data,
        message: data.alreadyDone ? 'Already marked present today' : kind === 'in' ? 'Marked present' : 'Checked out',
      });
    } catch (error) {
      next(error);
    }
  };
}

export const managerSelfCheckIn = handler('in');
export const managerSelfCheckOut = handler('out');
