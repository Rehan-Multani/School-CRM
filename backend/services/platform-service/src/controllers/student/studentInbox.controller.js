import { studentAccessService } from '../../services/studentAccess.service.js';
import { studentNoticeService } from '../../services/studentNotice.service.js';
import { studentInboxService } from '../../services/studentInbox.service.js';

async function loadCtx(req) {
  return studentAccessService.loadContext(req);
}

/* ------------------------------ NOTICES ------------------------------ */
export async function listNotices(req, res, next) {
  try {
    const { data, pagination, meta } = await studentNoticeService.notices(await loadCtx(req), req.query);
    res.json({ success: true, data, pagination, meta });
  } catch (error) {
    next(error);
  }
}

export async function getNotice(req, res, next) {
  try {
    res.json({ success: true, data: await studentNoticeService.notice(await loadCtx(req), req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function markNoticeRead(req, res, next) {
  try {
    res.json({ success: true, ...(await studentNoticeService.markNoticeRead(await loadCtx(req), req.params.id)) });
  } catch (error) {
    next(error);
  }
}

export async function markAllNoticesRead(req, res, next) {
  try {
    res.json({ success: true, ...(await studentNoticeService.markAllNoticesRead(await loadCtx(req))) });
  } catch (error) {
    next(error);
  }
}

/* ------------------------------- EVENTS ------------------------------- */
export async function listEvents(req, res, next) {
  try {
    const { data, pagination } = await studentNoticeService.events(await loadCtx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    res.json({ success: true, data: await studentNoticeService.event(await loadCtx(req), req.params.id) });
  } catch (error) {
    next(error);
  }
}

/* --------------------------- NOTIFICATIONS --------------------------- */
export async function listNotifications(req, res, next) {
  try {
    const { data, pagination } = await studentInboxService.list(await loadCtx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}

export async function getNotificationsUnreadCount(req, res, next) {
  try {
    res.json({ success: true, data: await studentInboxService.unreadCount(await loadCtx(req)) });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    res.json({ success: true, ...(await studentInboxService.markRead(await loadCtx(req), req.params.id)) });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    res.json({ success: true, ...(await studentInboxService.markAllRead(await loadCtx(req))) });
  } catch (error) {
    next(error);
  }
}

export async function registerDevice(req, res, next) {
  try {
    const data = await studentInboxService.registerDevice(await loadCtx(req), req.body || {});
    res.json({ success: true, data, message: 'Device registered' });
  } catch (error) {
    next(error);
  }
}
