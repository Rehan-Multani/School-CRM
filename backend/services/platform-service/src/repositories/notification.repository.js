import { DeviceToken } from '../models/DeviceToken.js';
import { PlatformNotification } from '../models/PlatformNotification.js';

export class NotificationRepository {
  create(payload) {
    return PlatformNotification.create(payload);
  }

  list({ schoolId = '' } = {}) {
    const filter = schoolId ? { $or: [{ schoolId: '' }, { schoolId }] } : {};
    return PlatformNotification.find(filter).sort({ createdAt: -1 }).limit(100);
  }

  inbox({ role, schoolIds = [], userId = '' }) {
    const filter = { audiences: role };
    if (schoolIds.length) {
      filter.$or = [{ schoolId: '' }, { schoolId: null }, { schoolId: { $in: schoolIds } }];
    }
    // Broadcasts (empty recipientRefIds) are always visible; targeted notifications
    // only show up for the specific userId they were addressed to.
    filter.$and = [
      {
        $or: [
          { recipientRefIds: { $exists: false } },
          { recipientRefIds: { $size: 0 } },
          ...(userId ? [{ recipientRefIds: userId }] : []),
        ],
      },
    ];
    return PlatformNotification.find(filter).sort({ createdAt: -1 }).limit(50);
  }

  upsertDevice({ token, role, schoolId, userId }) {
    return DeviceToken.findOneAndUpdate(
      { token },
      { token, role, schoolId: schoolId || '', userId: userId || '' },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  }

  findTokens({ roles, schoolIds = [], userIds }) {
    const filter = { role: { $in: roles } };
    if (schoolIds.length) {
      filter.schoolId = { $in: schoolIds };
    }
    if (userIds?.length) {
      filter.userId = { $in: userIds };
    }
    return DeviceToken.find(filter);
  }

  removeTokens(tokens) {
    if (!tokens?.length) {
      return Promise.resolve();
    }
    return DeviceToken.deleteMany({ token: { $in: tokens } });
  }
}

export const notificationRepository = new NotificationRepository();
