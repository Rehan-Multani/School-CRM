import { appSessionService } from '../services/appSession.service.js';

/**
 * Mobile-app session + version controls. See appSession.service.js.
 * Super Admin only: one school, or every school (`schoolId` omitted).
 */

const actorOf = (req) => ({ id: String(req.user?.sub || ''), role: String(req.user?.role || '') });

const summary = (data) =>
  `Signed out ${data.roles.join(', ').toLowerCase()}${data.schoolName ? ` of ${data.schoolName}` : ' of every school'}`;

/* -------------------------------- super admin -------------------------------- */

export async function superForceLogout(req, res, next) {
  try {
    const body = req.body || {};
    const data = await appSessionService.forceLogout(
      { roles: body.roles, message: body.message, schoolId: body.schoolId || null },
      actorOf(req)
    );
    res.json({ success: true, message: summary(data), data });
  } catch (error) {
    next(error);
  }
}

export async function superForceLogoutHistory(req, res, next) {
  try {
    const data = await appSessionService.history();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function notifyAppUpdate(req, res, next) {
  try {
    const data = await appSessionService.notifyAppUpdate();
    res.json({
      success: true,
      message: data.pushConfigured
        ? `Update notification sent to ${data.delivered} of ${data.devices} device(s).`
        : 'Push is not configured on this server — no notification was sent.',
      data,
    });
  } catch (error) {
    next(error);
  }
}

/* ----------------------------------- public ---------------------------------- */

export async function getLogoutNotice(req, res, next) {
  try {
    const data = await appSessionService.latestNotice({ role: req.query.role, schoolId: req.query.schoolId });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
