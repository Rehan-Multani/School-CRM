import { transportAccessService } from '../../services/transportAccess.service.js';
import { transportInboxService } from '../../services/transportInbox.service.js';

const ctx = (req) => transportAccessService.loadContext(req);

export async function listNotifications(req, res, next) {
  try {
    const { data, pagination } = await transportInboxService.list(await ctx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}
export async function getNotificationsUnreadCount(req, res, next) {
  try { res.json({ success: true, data: await transportInboxService.unreadCount(await ctx(req)) }); } catch (e) { next(e); }
}
export async function markNotificationRead(req, res, next) {
  try { res.json({ success: true, ...(await transportInboxService.markRead(await ctx(req), req.params.id)) }); } catch (e) { next(e); }
}
export async function markAllNotificationsRead(req, res, next) {
  try { res.json({ success: true, ...(await transportInboxService.markAllRead(await ctx(req))) }); } catch (e) { next(e); }
}
export async function registerDevice(req, res, next) {
  try {
    const data = await transportInboxService.registerDevice(await ctx(req), req.body || {});
    res.json({ success: true, data, message: 'Device registered' });
  } catch (e) { next(e); }
}
