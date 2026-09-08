import { transportAuthService } from '../../services/transportAuth.service.js';
import { transportProfileService } from '../../services/transportProfile.service.js';
import { transportAccessService } from '../../services/transportAccess.service.js';
import { schoolId, transportStaffId } from '../../utils/tenant.js';
import { auditLogService } from '../../services/auditLog.service.js';
import { collectSchoolUserUploadFiles } from '../../middleware/uploadSchoolUser.js';
import { deleteMulterFiles } from '../../utils/upload.utils.js';

export async function transportLogin(req, res, next) {
  try {
    const data = await transportAuthService.login(req.body || {});
    auditLogService.record(
      {
        user: { sub: data.staff.id, userId: data.staff.id, schoolId: data.school.id, name: data.staff.name, role: 'TRANSPORT' },
        headers: req.headers,
        socket: req.socket,
      },
      { module: 'AUTH', action: 'LOGIN', entityType: 'SchoolUser', entityId: data.staff.id, summary: `Transport staff ${data.staff.name} logged in` }
    );
    res.json({ success: true, message: 'Login successful', ...data });
  } catch (error) {
    next(error);
  }
}

export async function transportLogout(req, res, next) {
  try {
    auditLogService.record(req, { module: 'AUTH', action: 'LOGOUT', entityType: 'SchoolUser', entityId: transportStaffId(req), summary: 'Transport staff logged out' });
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

export async function transportMe(req, res, next) {
  try {
    const data = await transportAuthService.me(schoolId(req), transportStaffId(req), req.user?.role);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function transportChangePassword(req, res, next) {
  try {
    const data = await transportAuthService.changePassword(schoolId(req), transportStaffId(req), req.body || {});
    auditLogService.record(req, { module: 'AUTH', action: 'PASSWORD_CHANGE', entityType: 'SchoolUser', entityId: transportStaffId(req), summary: 'Transport staff changed password' });
    res.json({ success: true, message: data.message });
  } catch (error) {
    next(error);
  }
}

/* ------------------------------ profile / vehicle / route / settings ------------------------------ */
async function ctx(req) {
  return transportAccessService.loadContext(req);
}

export async function getTransportProfile(req, res, next) {
  try {
    res.json({ success: true, data: await transportProfileService.getProfile(await ctx(req)) });
  } catch (e) { next(e); }
}

export async function updateTransportProfile(req, res, next) {
  const files = collectSchoolUserUploadFiles(req);
  try {
    const data = await transportProfileService.updateProfile(await ctx(req), req.body || {}, files);
    auditLogService.record(req, { module: 'PROFILE', action: 'UPDATE', entityType: 'SchoolUser', entityId: transportStaffId(req), summary: 'Transport staff updated profile' });
    res.json({ success: true, data, message: 'Profile updated' });
  } catch (e) {
    deleteMulterFiles(req.files);
    next(e);
  }
}

export async function getTransportVehicle(req, res, next) {
  try {
    res.json({ success: true, data: await transportProfileService.vehicle(await ctx(req), req.query.vehicleId) });
  } catch (e) { next(e); }
}

export async function getTransportVehicleDocuments(req, res, next) {
  try {
    res.json({ success: true, data: await transportProfileService.vehicleDocuments(await ctx(req), req.query.vehicleId) });
  } catch (e) { next(e); }
}

export async function getTransportInspectionHistory(req, res, next) {
  try {
    const { data, pagination } = await transportProfileService.inspectionHistory(await ctx(req), req.query.vehicleId, req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}

export async function getTransportRoute(req, res, next) {
  try {
    res.json({ success: true, data: await transportProfileService.route(await ctx(req), req.query.routeId) });
  } catch (e) { next(e); }
}

export async function getTransportSettings(req, res, next) {
  try {
    res.json({ success: true, data: await transportProfileService.getSettings(await ctx(req)) });
  } catch (e) { next(e); }
}

export async function updateTransportSettings(req, res, next) {
  try {
    const data = await transportProfileService.updateSettings(await ctx(req), req.body || {});
    auditLogService.record(req, { module: 'TRANSPORT', action: 'SETTINGS_UPDATE', entityType: 'TransportSettings', entityId: schoolId(req), summary: 'Transport settings updated' });
    res.json({ success: true, data, message: 'Settings updated' });
  } catch (e) { next(e); }
}
