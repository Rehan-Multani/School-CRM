import { parentAccessService } from '../../services/parentAccess.service.js';
import { parentInboxService } from '../../services/parentInbox.service.js';

async function ctx(req) {
  return parentAccessService.loadContext(req);
}

/* ------------------------------ NOTICES ------------------------------ */
export async function listNotices(req, res, next) {
  try {
    const { data, pagination, meta } = await parentInboxService.notices(await ctx(req), req.query);
    res.json({ success: true, data, pagination, meta });
  } catch (e) { next(e); }
}
export async function getNotice(req, res, next) {
  try { res.json({ success: true, data: await parentInboxService.notice(await ctx(req), req.params.id) }); } catch (e) { next(e); }
}
export async function markNoticeRead(req, res, next) {
  try { res.json({ success: true, ...(await parentInboxService.markNoticeRead(await ctx(req), req.params.id)) }); } catch (e) { next(e); }
}
export async function markAllNoticesRead(req, res, next) {
  try { res.json({ success: true, ...(await parentInboxService.markAllNoticesRead(await ctx(req))) }); } catch (e) { next(e); }
}

/* ------------------------------- EVENTS ------------------------------- */
export async function listEvents(req, res, next) {
  try {
    const { data, pagination } = await parentInboxService.events(await ctx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}
export async function getEvent(req, res, next) {
  try { res.json({ success: true, data: await parentInboxService.event(await ctx(req), req.params.id) }); } catch (e) { next(e); }
}

/* --------------------------- NOTIFICATIONS --------------------------- */
export async function listNotifications(req, res, next) {
  try {
    const { data, pagination } = await parentInboxService.notifications(await ctx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}
export async function getNotificationsUnreadCount(req, res, next) {
  try { res.json({ success: true, data: await parentInboxService.unreadCount(await ctx(req)) }); } catch (e) { next(e); }
}
export async function markNotificationRead(req, res, next) {
  try { res.json({ success: true, ...(await parentInboxService.markNotificationRead(await ctx(req), req.params.id)) }); } catch (e) { next(e); }
}
export async function markAllNotificationsRead(req, res, next) {
  try { res.json({ success: true, ...(await parentInboxService.markAllNotificationsRead(await ctx(req))) }); } catch (e) { next(e); }
}
export async function registerDevice(req, res, next) {
  try {
    const data = await parentInboxService.registerDevice(await ctx(req), req.body || {});
    res.json({ success: true, data, message: 'Device registered' });
  } catch (e) { next(e); }
}
