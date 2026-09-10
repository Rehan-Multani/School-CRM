import { notificationService } from '../services/notification.service.js';
import { isFirebaseConfigured } from '../config/firebase.js';
import { deviceRoleForUser } from '../middleware/requirePlatformUser.js';

function schoolId(req) {
  const rawRole = String(req.user?.role || '').toUpperCase().replace(/[\s_-]/g, '');
  if (rawRole === 'SUPERADMIN') {
    return '';
  }
  return req.user?.schoolId || req.user?.sub || '';
}

function schoolIdsForReq(req) {
  const rawRole = String(req.user?.role || '').toUpperCase().replace(/[\s_-]/g, '');
  if (rawRole === 'SUPERADMIN') {
    return [];
  }
  const ids = new Set();
  if (req.user?.schoolId) ids.add(String(req.user.schoolId).trim());
  if (req.user?.sub) ids.add(String(req.user.sub).trim());
  return Array.from(ids).filter(Boolean);
}

export async function listNotifications(req, res, next) {
  try {
    const data = await notificationService.list();
    res.json({ success: true, firebaseConfigured: data.firebaseConfigured, data: data.items });
  } catch (error) {
    next(error);
  }
}

export async function listSchoolNotifications(req, res, next) {
  try {
    const data = await notificationService.listForSchool(schoolId(req) || '');
    res.json({ success: true, firebaseConfigured: data.firebaseConfigured, data: data.items });
  } catch (error) {
    next(error);
  }
}

/**
 * Both handlers below derive role / schoolId / userId from the verified JWT.
 *
 * They previously read all three from the query string or body on an
 * unauthenticated route, which let anyone read any school's notification inbox
 * by guessing a schoolId, and register a device token against any user — so
 * pushes meant for a parent could be delivered to an attacker's device. Client
 * input is now ignored entirely for scoping.
 */
export async function inboxNotifications(req, res, next) {
  try {
    const data = await notificationService.inbox({
      role: deviceRoleForUser(req.user),
      schoolId: schoolIdsForReq(req),
      userId: req.user?.userId || req.user?.sub || '',
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function registerDevice(req, res, next) {
  try {
    const data = await notificationService.registerDevice({
      token: req.body?.token,
      role: deviceRoleForUser(req.user),
      schoolId: schoolId(req) || '',
      userId: req.user?.userId || req.user?.sub || '',
    });
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function sendNotification(req, res, next) {
  try {
    const data = await notificationService.send(req.body, req.user?.sub || null);
    res.status(201).json({
      success: true,
      message: data.delivery.skippedReason
        ? `Notification saved. ${data.delivery.skippedReason}.`
        : `Notification sent to ${data.delivery.success} device(s).`,
      data,
      firebaseConfigured: isFirebaseConfigured(),
    });
  } catch (error) {
    next(error);
  }
}

export async function sendSchoolNotification(req, res, next) {
  try {
    const data = await notificationService.send(req.body, req.user?.sub || null, {
      schoolId: schoolId(req) || '',
    });
    res.status(201).json({
      success: true,
      message: data.delivery.skippedReason
        ? `Notification saved. ${data.delivery.skippedReason}.`
        : `Notification sent to ${data.delivery.success} device(s).`,
      data,
      firebaseConfigured: isFirebaseConfigured(),
    });
  } catch (error) {
    next(error);
  }
}

export async function sendLibraryNotification(req, res, next) {
  try {
    const data = await notificationService.send(req.body, req.user?.sub || null, {
      schoolId: schoolId(req) || '',
    });
    const recipientCount = data.recipientRefIds?.length || 0;
    res.status(201).json({
      success: true,
      message: recipientCount
        ? `Notification sent to ${recipientCount} recipient(s).`
        : data.delivery.skippedReason
        ? `Notification saved. ${data.delivery.skippedReason}.`
        : `Notification sent to ${data.delivery.success} device(s).`,
      data,
      firebaseConfigured: isFirebaseConfigured(),
    });
  } catch (error) {
    next(error);
  }
}
