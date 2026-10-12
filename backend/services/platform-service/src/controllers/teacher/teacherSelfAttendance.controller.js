import { teacherAccessService } from '../../services/teacherAccess.service.js';
import { staffSelfAttendanceService, teacherActor } from '../../services/staffSelfAttendance.service.js';
import { auditLogService } from '../../services/auditLog.service.js';

export async function getSelfAttendanceToday(req, res, next) {
  try {
    const ctx = await teacherAccessService.loadContext(req);
    res.json({ success: true, data: await staffSelfAttendanceService.today(teacherActor(ctx)) });
  } catch (error) {
    next(error);
  }
}

function handler(kind) {
  return async (req, res, next) => {
    try {
      const ctx = await teacherAccessService.loadContext(req);
      const body = req.body || {};
      const data =
        kind === 'in'
          ? await staffSelfAttendanceService.checkIn(teacherActor(ctx), body)
          : await staffSelfAttendanceService.checkOut(teacherActor(ctx), body);
      if (!data.alreadyDone) {
        auditLogService.record(req, {
          module: 'ATTENDANCE',
          action: kind === 'in' ? 'SELF_CHECK_IN' : 'SELF_CHECK_OUT',
          entityType: 'StaffAttendance',
          entityId: data.record?.id,
          summary: `Teacher ${kind === 'in' ? 'checked in' : 'checked out'} from the app (${data.record?.distanceMeters ?? '?'} m from school)`,
        });
      }
      const verb = kind === 'in' ? 'checked in' : 'checked out';
      res.json({
        success: true,
        data,
        message: data.alreadyDone ? `Already ${verb} today` : `Successfully ${verb}`,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const selfCheckIn = handler('in');
export const selfCheckOut = handler('out');
