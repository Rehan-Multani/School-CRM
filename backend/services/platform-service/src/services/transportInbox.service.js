import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { PlatformNotification } from '../models/PlatformNotification.js';
import { ReadReceipt } from '../models/ReadReceipt.js';
import { School } from '../models/School.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { notificationLite } from '../serializers/student.serializers.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

async function schoolSlugVariants(schoolId) {
  const school = await School.findById(schoolId).select('schoolId').lean();
  const slug = school?.schoolId || '';
  return { slug, variants: [slug].filter(Boolean) };
}

class TransportInboxService {
  async list(ctx, query = {}) {
    const { variants } = await schoolSlugVariants(ctx.schoolId);
    const rows = await notificationRepository.inbox({ role: 'transport', schoolIds: variants, userId: ctx.staffId });
    const { page, limit } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const readSet = await this.#readSet(ctx.staffId, rows.map((r) => String(r._id)));
    const start = (page - 1) * limit;
    return {
      data: rows.slice(start, start + limit).map((r) => notificationLite(r.toPublicJSON(), readSet.has(String(r._id)))),
      pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) || 1 },
    };
  }

  async unreadCount(ctx) {
    const { variants } = await schoolSlugVariants(ctx.schoolId);
    const rows = await notificationRepository.inbox({ role: 'transport', schoolIds: variants, userId: ctx.staffId });
    const readSet = await this.#readSet(ctx.staffId, rows.map((r) => String(r._id)));
    return { unread: rows.filter((r) => !readSet.has(String(r._id))).length };
  }

  async markRead(ctx, id) {
    const row = await PlatformNotification.findById(oid(id)).select('_id').lean();
    if (!row) throw new AppError('Notification not found', 404, TRANSPORT_ERR.NOT_FOUND);
    await ReadReceipt.updateOne(
      { userId: String(ctx.staffId), refType: 'NOTIFICATION', refId: String(id) },
      { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'TRANSPORT', readAt: new Date() } },
      { upsert: true }
    );
    return { message: 'Marked as read' };
  }

  async markAllRead(ctx) {
    const { variants } = await schoolSlugVariants(ctx.schoolId);
    const rows = await notificationRepository.inbox({ role: 'transport', schoolIds: variants, userId: ctx.staffId });
    if (!rows.length) return { marked: 0 };
    const ops = rows.map((r) => ({
      updateOne: {
        filter: { userId: String(ctx.staffId), refType: 'NOTIFICATION', refId: String(r._id) },
        update: { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'TRANSPORT', readAt: new Date() } },
        upsert: true,
      },
    }));
    const res = await ReadReceipt.bulkWrite(ops, { ordered: false });
    return { marked: res.upsertedCount ?? 0 };
  }

  async registerDevice(ctx, body = {}) {
    const token = String(body.token || body.fcmToken || '').trim();
    if (!token || token.length < 20) {
      throw new AppError('A valid device token is required', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    const { slug } = await schoolSlugVariants(ctx.schoolId);
    const doc = await notificationRepository.upsertDevice({
      token,
      role: 'transport',
      schoolId: slug || String(ctx.schoolId),
      userId: String(ctx.staffId),
    });
    return { registered: true, id: String(doc._id) };
  }

  async #readSet(staffId, ids) {
    if (!ids.length) return new Set();
    const rows = await ReadReceipt.find({ userId: String(staffId), refType: 'NOTIFICATION', refId: { $in: ids } })
      .select('refId')
      .lean();
    return new Set(rows.map((r) => r.refId));
  }
}

export const transportInboxService = new TransportInboxService();
