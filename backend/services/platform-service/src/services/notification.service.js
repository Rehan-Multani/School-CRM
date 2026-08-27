import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { DEVICE_ROLES } from '../models/DeviceToken.js';
import { getFirebaseMessaging, isFirebaseConfigured } from '../config/firebase.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { schoolRepository } from '../repositories/school.repository.js';

const SCHOOL_ID_ALIASES = {
  'SCH-2026-09': 'greenfield-public-school',
  'greenfield-public-school': 'SCH-2026-09',
};

function schoolIdVariants(schoolId) {
  if (!schoolId) return [];
  const alias = SCHOOL_ID_ALIASES[schoolId];
  return alias ? [schoolId, alias] : [schoolId];
}

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
]);

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new AppError(`${label} is required`, 400);
  }
  return text;
}

function normalizeAudiences(value) {
  const raw = Array.isArray(value) ? value : value ? [value] : DEVICE_ROLES;
  const audiences = [
    ...new Set(
      raw
        .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
        .map((item) => (item === 'admin' ? 'school-admin' : item))
        .filter((item) => DEVICE_ROLES.includes(item))
    ),
  ];

  if (!audiences.length) {
    throw new AppError('Select at least one recipient', 400);
  }

  return audiences;
}

function chunk(items, size) {
  const groups = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

async function sendViaFirebase(tokens, title, body) {
  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return {
      firebaseConfigured: false,
      attempted: 0,
      success: 0,
      failed: 0,
      skippedReason: 'Firebase is not configured on the server',
      invalidTokens: [],
    };
  }

  if (!tokens.length) {
    return {
      firebaseConfigured: true,
      attempted: 0,
      success: 0,
      failed: 0,
      skippedReason: 'No principal or school-admin devices are registered yet',
      invalidTokens: [],
    };
  }

  let success = 0;
  let failed = 0;
  const invalidTokens = [];

  for (const group of chunk(tokens, 500)) {
    const response = await messaging.sendEachForMulticast({
      tokens: group,
      notification: { title, body },
      data: {
        title,
        body,
        type: 'platform',
      },
      webpush: {
        notification: {
          title,
          body,
          icon: '/School_logo.png',
        },
      },
    });

    success += response.successCount;
    failed += response.failureCount;

    response.responses.forEach((item, index) => {
      if (item.success) return;
      const code = item.error?.code || '';
      if (INVALID_TOKEN_CODES.has(code)) {
        invalidTokens.push(group[index]);
      }
    });
  }

  return {
    firebaseConfigured: true,
    attempted: tokens.length,
    success,
    failed,
    skippedReason: '',
    invalidTokens,
  };
}

export class NotificationService {
  async list() {
    const items = await notificationRepository.list();
    return {
      firebaseConfigured: isFirebaseConfigured(),
      items: items.map((item) => item.toPublicJSON()),
    };
  }

  async listForSchool(schoolId) {
    let normalizedSchoolId = typeof schoolId === 'string' ? schoolId.trim() : '';
    if (normalizedSchoolId && mongoose.isValidObjectId(normalizedSchoolId)) {
      const school = await schoolRepository.findById(normalizedSchoolId);
      normalizedSchoolId = school?.schoolId || '';
    }
    const items = await notificationRepository.list({ schoolId: normalizedSchoolId });
    return {
      firebaseConfigured: isFirebaseConfigured(),
      items: items.map((item) => item.toPublicJSON()),
    };
  }

  async inbox({ role, schoolId, userId }) {
    const normalizedRole = role === 'admin' ? 'school-admin' : role;
    if (!DEVICE_ROLES.includes(normalizedRole)) {
      throw new AppError(`Role must be one of: ${DEVICE_ROLES.join(', ')}`, 400);
    }

    const items = await notificationRepository.inbox({
      role: normalizedRole,
      schoolIds: schoolIdVariants(typeof schoolId === 'string' ? schoolId.trim() : ''),
      userId: typeof userId === 'string' ? userId.trim() : '',
    });
    return items.map((item) => item.toPublicJSON());
  }

  async registerDevice(payload) {
    const token = requireText(payload?.token, 'Device token');
    const role = payload?.role === 'admin' ? 'school-admin' : payload?.role;
    if (!DEVICE_ROLES.includes(role)) {
      throw new AppError(`Role must be one of: ${DEVICE_ROLES.join(', ')}`, 400);
    }

    await notificationRepository.upsertDevice({
      token,
      role,
      schoolId: typeof payload?.schoolId === 'string' ? payload.schoolId.trim() : '',
      userId: typeof payload?.userId === 'string' ? payload.userId.trim() : '',
    });

    return { registered: true };
  }

  async send(payload, createdBy, options = {}) {
    const title = requireText(payload?.title, 'Title');
    const body = requireText(payload?.body || payload?.message, 'Message');
    const audiences = normalizeAudiences(payload?.audiences || payload?.audience);
    const forcedSchoolId =
      typeof options?.schoolId === 'string' ? options.schoolId.trim() : '';
    const schoolId = forcedSchoolId || (typeof payload?.schoolId === 'string' ? payload.schoolId.trim() : '');

    let school = null;
    if (schoolId) {
      if (!mongoose.isValidObjectId(schoolId)) {
        throw new AppError('School not found', 404);
      }
      school = await schoolRepository.findById(schoolId);
      if (!school) {
        throw new AppError('School not found', 404);
      }
    }

    const recipientRefIds = Array.isArray(payload?.recipientRefIds)
      ? [...new Set(payload.recipientRefIds.map(String).filter(Boolean))]
      : [];

    const devices = await notificationRepository.findTokens({
      roles: audiences,
      schoolIds: schoolIdVariants(school?.schoolId || ''),
      userIds: recipientRefIds.length ? recipientRefIds : undefined,
    });
    const tokens = devices.map((device) => device.token);

    const delivery = await sendViaFirebase(tokens, title, body);
    await notificationRepository.removeTokens(delivery.invalidTokens);

    const notification = await notificationRepository.create({
      title,
      body,
      audiences,
      recipientRefIds,
      schoolId: school?.schoolId || '',
      schoolName: school?.name || '',
      createdBy,
      delivery: {
        firebaseConfigured: delivery.firebaseConfigured,
        attempted: delivery.attempted,
        success: delivery.success,
        failed: delivery.failed,
        skippedReason: delivery.skippedReason,
      },
    });

    return notification.toPublicJSON();
  }
}

export const notificationService = new NotificationService();
