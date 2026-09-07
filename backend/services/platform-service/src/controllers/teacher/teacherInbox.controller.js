import { teacherAccessService } from '../../services/teacherAccess.service.js';
import { teacherLeaveService } from '../../services/teacherLeave.service.js';
import { teacherInboxService } from '../../services/teacherInbox.service.js';
import { teacherMessagesService } from '../../services/teacherMessages.service.js';
import { notificationService } from '../../services/notification.service.js';
import { schoolId, teacherId } from '../../utils/tenant.js';
import { auditLogService } from '../../services/auditLog.service.js';

const ctxOf = (req) => teacherAccessService.loadContext(req);

/* ------------------------------- LEAVE ------------------------------- */
export async function applyLeave(req, res, next) {
  try {
    const data = await teacherLeaveService.apply(await ctxOf(req), req.body || {});
    auditLogService.record(req, { module: 'LEAVE', action: 'APPLY', entityType: 'LeaveRequest', entityId: data.id, summary: `Applied for ${data.leaveType} leave` });
    res.status(201).json({ success: true, data, message: 'Leave request submitted' });
  } catch (e) { next(e); }
}
export async function listLeaves(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherLeaveService.list(await ctxOf(req), req.query)) });
  } catch (e) { next(e); }
}
export async function getLeave(req, res, next) {
  try {
    res.json({ success: true, data: await teacherLeaveService.get(await ctxOf(req), req.params.id) });
  } catch (e) { next(e); }
}
export async function cancelLeave(req, res, next) {
  try {
    const r = await teacherLeaveService.cancel(await ctxOf(req), req.params.id);
    auditLogService.record(req, { module: 'LEAVE', action: 'CANCEL', entityType: 'LeaveRequest', entityId: req.params.id, summary: 'Cancelled leave request' });
    res.json({ success: true, ...r });
  } catch (e) { next(e); }
}

/* --------------------------- ANNOUNCEMENTS --------------------------- */
export async function listAnnouncements(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherInboxService.announcements(await ctxOf(req), req.query)) });
  } catch (e) { next(e); }
}
export async function getAnnouncement(req, res, next) {
  try {
    res.json({ success: true, data: await teacherInboxService.announcement(await ctxOf(req), req.params.id) });
  } catch (e) { next(e); }
}
export async function readAnnouncement(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherInboxService.markAnnouncementRead(await ctxOf(req), req.params.id)) });
  } catch (e) { next(e); }
}

/* --------------------------- NOTIFICATIONS --------------------------- */
export async function listNotifications(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherInboxService.notifications(await ctxOf(req), req.query)) });
  } catch (e) { next(e); }
}
export async function notificationsUnreadCount(req, res, next) {
  try {
    res.json({ success: true, data: await teacherInboxService.unreadCount(await ctxOf(req)) });
  } catch (e) { next(e); }
}
export async function readNotification(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherInboxService.markNotificationRead(await ctxOf(req), req.params.id)) });
  } catch (e) { next(e); }
}
export async function readAllNotifications(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherInboxService.markAllNotificationsRead(await ctxOf(req))) });
  } catch (e) { next(e); }
}

/* --------------------------- DEVICE TOKEN --------------------------- */
export async function registerTeacherDevice(req, res, next) {
  try {
    const data = await notificationService.registerDevice({
      token: req.body?.token,
      role: 'teacher',
      schoolId: schoolId(req),
      userId: teacherId(req),
    });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

/* --------------------------- COMMUNICATION --------------------------- */
export async function listConversations(req, res, next) {
  try {
    res.json({ success: true, data: await teacherMessagesService.conversations(await ctxOf(req)) });
  } catch (e) { next(e); }
}
export async function getConversationMessages(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherMessagesService.messages(await ctxOf(req), req.params.id, req.query)) });
  } catch (e) { next(e); }
}
export async function postConversationMessage(req, res, next) {
  try {
    const data = await teacherMessagesService.post(await ctxOf(req), req.params.id, req.body || {});
    res.status(201).json({ success: true, data, message: 'Message sent' });
  } catch (e) { next(e); }
}
export async function readConversationMessage(req, res, next) {
  try {
    res.json({ success: true, ...(await teacherMessagesService.markRead(await ctxOf(req), req.params.id)) });
  } catch (e) { next(e); }
}
