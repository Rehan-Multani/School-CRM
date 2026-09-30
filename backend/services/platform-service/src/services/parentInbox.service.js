import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Announcement } from '../models/Communication.js';
import { Event } from '../models/Event.js';
import { PlatformNotification } from '../models/PlatformNotification.js';
import { ReadReceipt } from '../models/ReadReceipt.js';
import { schoolSlugOf } from '../utils/schoolSlug.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { noticeLite, eventLite, notificationLite } from '../serializers/student.serializers.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const PARENT_AUDIENCES = ['ALL', 'PARENTS'];

async function schoolSlugVariants(schoolId) {
  const school = { schoolId: await schoolSlugOf(schoolId) };
  const slug = school?.schoolId || '';
  return { slug, variants: [slug].filter(Boolean) };
}

/**
 * Parent notices/events/notifications. Same shapes as the Student APK inbox but
 * scoped to the `PARENTS`/`ALL` audience and `ReadReceipt.userType = 'PARENT'`.
 * `ctx` here is the PARENT ctx (has `parentId`, `schoolId`).
 */
class ParentInboxService {
  /* ------------------------------ NOTICES ------------------------------ */
  #noticeFilter(ctx, extraClassIds = []) {
    const now = new Date();
    return {
      schoolId: oid(ctx.schoolId),
      status: 'PUBLISHED',
      audiences: { $in: PARENT_AUDIENCES },
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    };
  }

  async notices(ctx, query = {}) {
    const filter = this.#noticeFilter(ctx);
    if (query.category) {
      filter.audiences = { $in: [String(query.category).toUpperCase(), ...PARENT_AUDIENCES] };
    }
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      Announcement.find(filter).sort({ pinned: -1, createdAt: -1 }).skip(skip).limit(limit),
      Announcement.countDocuments(filter),
    ]);
    const readSet = await this.#readSet(ctx.parentId, 'ANNOUNCEMENT', rows.map((r) => String(r._id)));
    const unread = await this.#unreadNoticeCount(ctx);
    return {
      data: rows.map((r) => noticeLite(r.toPublicJSON(), readSet.has(String(r._id)))),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      meta: { unread },
    };
  }

  async notice(ctx, id) {
    const row = await Announcement.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id), status: 'PUBLISHED' });
    if (!row || !(row.audiences || []).some((a) => PARENT_AUDIENCES.includes(a))) {
      throw new AppError('Notice not found', 404, PARENT_ERR.NOT_FOUND);
    }
    const readSet = await this.#readSet(ctx.parentId, 'ANNOUNCEMENT', [String(row._id)]);
    return noticeLite(row.toPublicJSON(), readSet.has(String(row._id)));
  }

  async markNoticeRead(ctx, id) {
    const row = await Announcement.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id) }).select('_id audiences').lean();
    if (!row || !(row.audiences || []).some((a) => PARENT_AUDIENCES.includes(a))) {
      throw new AppError('Notice not found', 404, PARENT_ERR.NOT_FOUND);
    }
    await this.#markRead(ctx, 'ANNOUNCEMENT', id);
    return { message: 'Marked as read' };
  }

  async markAllNoticesRead(ctx) {
    const rows = await Announcement.find(this.#noticeFilter(ctx)).select('_id').lean();
    if (!rows.length) return { marked: 0 };
    const ops = rows.map((r) => ({
      updateOne: {
        filter: { userId: String(ctx.parentId), refType: 'ANNOUNCEMENT', refId: String(r._id) },
        update: { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'PARENT', readAt: new Date() } },
        upsert: true,
      },
    }));
    const res = await ReadReceipt.bulkWrite(ops, { ordered: false });
    return { marked: res.upsertedCount ?? 0 };
  }

  async #unreadNoticeCount(ctx) {
    const rows = await Announcement.find(this.#noticeFilter(ctx)).select('_id').lean();
    if (!rows.length) return 0;
    const readSet = await this.#readSet(ctx.parentId, 'ANNOUNCEMENT', rows.map((r) => String(r._id)));
    return rows.filter((r) => !readSet.has(String(r._id))).length;
  }

  /* ------------------------------- EVENTS ------------------------------- */
  async events(ctx, query = {}) {
    const scope = String(query.scope || 'upcoming').toLowerCase();
    const now = new Date();
    const filter = { schoolId: oid(ctx.schoolId), audiences: { $in: PARENT_AUDIENCES } };
    filter.endAt = scope === 'past' ? { $lt: now } : { $gte: now };
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      Event.find(filter).sort({ startAt: scope === 'past' ? -1 : 1 }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);
    return {
      data: rows.map((r) => eventLite(r.toPublicJSON())),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async event(ctx, id) {
    const row = await Event.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id) });
    if (!row || !(row.audiences || []).some((a) => PARENT_AUDIENCES.includes(a))) {
      throw new AppError('Event not found', 404, PARENT_ERR.NOT_FOUND);
    }
    return eventLite(row.toPublicJSON());
  }

  /* --------------------------- NOTIFICATIONS --------------------------- */
  async notifications(ctx, query = {}) {
    const { variants } = await schoolSlugVariants(ctx.schoolId);
    const rows = await notificationRepository.inbox({ role: 'parent', schoolIds: variants, userId: ctx.parentId });
    const { page, limit } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const readSet = await this.#readSet(ctx.parentId, 'NOTIFICATION', rows.map((r) => String(r._id)));
    const start = (page - 1) * limit;
    return {
      data: rows.slice(start, start + limit).map((r) => notificationLite(r.toPublicJSON(), readSet.has(String(r._id)))),
      pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) || 1 },
    };
  }

  async unreadCount(ctx) {
    const { variants } = await schoolSlugVariants(ctx.schoolId);
    const rows = await notificationRepository.inboxIds({ role: 'parent', schoolIds: variants, userId: ctx.parentId });
    const readSet = await this.#readSet(ctx.parentId, 'NOTIFICATION', rows.map((r) => String(r._id)));
    return { unread: rows.filter((r) => !readSet.has(String(r._id))).length };
  }

  async markNotificationRead(ctx, id) {
    const row = await PlatformNotification.findById(oid(id)).select('_id').lean();
    if (!row) throw new AppError('Notification not found', 404, PARENT_ERR.NOT_FOUND);
    await this.#markRead(ctx, 'NOTIFICATION', id);
    return { message: 'Marked as read' };
  }

  async markAllNotificationsRead(ctx) {
    const { variants } = await schoolSlugVariants(ctx.schoolId);
    const rows = await notificationRepository.inboxIds({ role: 'parent', schoolIds: variants, userId: ctx.parentId });
    if (!rows.length) return { marked: 0 };
    const ops = rows.map((r) => ({
      updateOne: {
        filter: { userId: String(ctx.parentId), refType: 'NOTIFICATION', refId: String(r._id) },
        update: { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'PARENT', readAt: new Date() } },
        upsert: true,
      },
    }));
    const res = await ReadReceipt.bulkWrite(ops, { ordered: false });
    return { marked: res.upsertedCount ?? 0 };
  }

  async registerDevice(ctx, body = {}) {
    const token = String(body.token || body.fcmToken || '').trim();
    if (!token || token.length < 20) {
      throw new AppError('A valid device token is required', 400, PARENT_ERR.VALIDATION_ERROR);
    }
    const { slug } = await schoolSlugVariants(ctx.schoolId);
    const doc = await notificationRepository.upsertDevice({
      token,
      role: 'parent',
      schoolId: slug || String(ctx.schoolId),
      userId: String(ctx.parentId),
    });
    return { registered: true, id: String(doc._id) };
  }

  /* ------------------------------- shared ------------------------------- */
  async #readSet(parentId, refType, ids) {
    if (!ids.length) return new Set();
    const rows = await ReadReceipt.find({ userId: String(parentId), refType, refId: { $in: ids } })
      .select('refId')
      .lean();
    return new Set(rows.map((r) => r.refId));
  }

  async #markRead(ctx, refType, refId) {
    await ReadReceipt.updateOne(
      { userId: String(ctx.parentId), refType, refId: String(refId) },
      { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'PARENT', readAt: new Date() } },
      { upsert: true }
    );
  }
}

export const parentInboxService = new ParentInboxService();
