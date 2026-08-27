import { notificationService } from '../services/notification.service.js';
import { isFirebaseConfigured } from '../config/firebase.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub;
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

export async function inboxNotifications(req, res, next) {
  try {
    const data = await notificationService.inbox({
      role: req.query?.role,
      schoolId: req.query?.schoolId,
      userId: req.query?.userId,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function registerDevice(req, res, next) {
  try {
    const data = await notificationService.registerDevice(req.body);
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
