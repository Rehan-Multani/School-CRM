import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Announcement } from '../models/Communication.js';
import { Event } from '../models/Event.js';
import { PlatformNotification } from '../models/PlatformNotification.js';
import { ReadReceipt } from '../models/ReadReceipt.js';
import { School } from '../models/School.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { notificationLite, announcementLite } from '../serializers/teacher.serializers.js';
import { eventLite } from '../serializers/student.serializers.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

const TEACHER_AUDIENCES = ['ALL', 'TEACHERS', 'STAFF'];

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const SCHOOL_ID_ALIASES = {
  'SCH-2026-09': 'greenfield-public-school',
  'greenfield-public-school': 'SCH-2026-09',
};

async function schoolSlugVariants(schoolId) {
  const school = await School.findById(schoolId).select('schoolId').lean();
  const slug = school?.schoolId || '';
  const out = [slug].filter(Boolean);
  if (SCHOOL_ID_ALIASES[slug]) out.push(SCHOOL_ID_ALIASES[slug]);
  return { slug, variants: out };
}

class TeacherInboxService {
  /* --------------------------- ANNOUNCEMENTS --------------------------- */
  async announcements(ctx, query = {}) {
    const now = new Date();
    const filter = {
      schoolId: oid(ctx.schoolId),
      status: 'PUBLISHED',
      audiences: { $in: ['ALL', 'TEACHERS', 'STAFF'] },
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    };
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      Announcement.find(filter).sort({ pinned: -1, createdAt: -1 }).skip(skip).limit(limit),
      Announcement.countDocuments(filter),
    ]);
    const readSet = await this.#readSet(ctx.teacherId, 'ANNOUNCEMENT', rows.map((r) => String(r._id)));
    return {
      data: rows.map((r) => announcementLite(r.toPublicJSON(), readSet.has(String(r._id)))),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async announcement(ctx, id) {
    const row = await Announcement.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id), status: 'PUBLISHED' });
    if (!row) throw new AppError('Announcement not found', 404, TEACHER_ERR.NOT_FOUND);
    const aud = row.audiences || [];
    if (!aud.some((a) => ['ALL', 'TEACHERS', 'STAFF'].includes(a))) {
      throw new AppError('Announcement not found', 404, TEACHER_ERR.NOT_FOUND);
    }
    const readSet = await this.#readSet(ctx.teacherId, 'ANNOUNCEMENT', [String(row._id)]);
    return announcementLite(row.toPublicJSON(), readSet.has(String(row._id)));
  }

  async markAnnouncementRead(ctx, id) {
    const row = await Announcement.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id) }).select('_id').lean();
    if (!row) throw new AppError('Announcement not found', 404, TEACHER_ERR.NOT_FOUND);
    await this.#markRead(ctx, 'ANNOUNCEMENT', id);
    return { message: 'Marked as read' };
  }

  async markAllAnnouncementsRead(ctx) {
    const now = new Date();
    const filter = {
      schoolId: oid(ctx.schoolId),
      status: 'PUBLISHED',
      audiences: { $in: TEACHER_AUDIENCES },
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    };
    const rows = await Announcement.find(filter).select('_id').lean();
    if (!rows.length) return { marked: 0 };
    const ops = rows.map((r) => ({
      updateOne: {
        filter: { userId: String(ctx.teacherId), refType: 'ANNOUNCEMENT', refId: String(r._id) },
        update: { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'TEACHER', readAt: new Date() } },
        upsert: true,
      },
    }));
    const res = await ReadReceipt.bulkWrite(ops, { ordered: false });
    return { marked: res.upsertedCount ?? 0 };
  }

  /* ------------------------------- EVENTS ------------------------------- */
  async events(ctx, query = {}) {
    const scope = String(query.scope || 'upcoming').toLowerCase();
    const now = new Date();
    const filter = { schoolId: oid(ctx.schoolId), audiences: { $in: TEACHER_AUDIENCES } };
    filter.endAt = scope === 'past' ? { $lt: now } : { $gte: now };
    const sortDir = scope === 'past' ? -1 : 1;
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      Event.find(filter).sort({ startAt: sortDir }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);
    return {
      data: rows.map((r) => eventLite(r.toPublicJSON())),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async event(ctx, id) {
    const row = await Event.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id) });
    if (!row || !(row.audiences || []).some((a) => TEACHER_AUDIENCES.includes(a))) {
      throw new AppError('Event not found', 404, TEACHER_ERR.NOT_FOUND);
    }
    return eventLite(row.toPublicJSON());
  }

  /* --------------------------- NOTIFICATIONS --------------------------- */
  async notifications(ctx, query = {}) {
    const { variants } = await schoolSlugVariants(ctx.schoolId);
    const rows = await notificationRepository.inbox({ role: 'teacher', schoolIds: variants, userId: ctx.teacherId });
    const { page, limit } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const readSet = await this.#readSet(ctx.teacherId, 'NOTIFICATION', rows.map((r) => String(r._id)));
    const start = (page - 1) * limit;
    return {
      data: rows.slice(start, start + limit).map((r) => notificationLite(r.toPublicJSON(), readSet.has(String(r._id)))),
      pagination: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) || 1 },
    };
  }

  async unreadCount(ctx) {
    const { variants } = await schoolSlugVariants(ctx.schoolId);
    const rows = await notificationRepository.inbox({ role: 'teacher', schoolIds: variants, userId: ctx.teacherId });
    const readSet = await this.#readSet(ctx.teacherId, 'NOTIFICATION', rows.map((r) => String(r._id)));
    const unread = rows.filter((r) => !readSet.has(String(r._id))).length;
    return { unread };
  }

  async markNotificationRead(ctx, id) {
    const row = await PlatformNotification.findById(oid(id)).select('_id').lean();
    if (!row) throw new AppError('Notification not found', 404, TEACHER_ERR.NOT_FOUND);
    await this.#markRead(ctx, 'NOTIFICATION', id);
    return { message: 'Marked as read' };
  }

  async markAllNotificationsRead(ctx) {
    const { variants } = await schoolSlugVariants(ctx.schoolId);
    const rows = await notificationRepository.inbox({ role: 'teacher', schoolIds: variants, userId: ctx.teacherId });
    if (!rows.length) return { marked: 0 };
    const ops = rows.map((r) => ({
      updateOne: {
        filter: { userId: String(ctx.teacherId), refType: 'NOTIFICATION', refId: String(r._id) },
        update: { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'TEACHER', readAt: new Date() } },
        upsert: true,
      },
    }));
    const res = await ReadReceipt.bulkWrite(ops, { ordered: false });
    return { marked: res.upsertedCount ?? 0 };
  }

  /* --------------------------- DEVICE TOKEN --------------------------- */
  async registerDevice(ctx, body = {}) {
    const token = String(body.token || body.fcmToken || '').trim();
    if (!token || token.length < 20) {
      throw new AppError('A valid device token is required', 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    const { slug } = await schoolSlugVariants(ctx.schoolId);
    const doc = await notificationRepository.upsertDevice({
      token,
      role: 'teacher',
      schoolId: slug || String(ctx.schoolId),
      userId: String(ctx.teacherId),
    });
    return { registered: true, id: String(doc._id) };
  }

  /* ------------------------------- shared ------------------------------- */
  async #readSet(teacherId, refType, ids) {
    if (!ids.length) return new Set();
    const rows = await ReadReceipt.find({ userId: String(teacherId), refType, refId: { $in: ids } })
      .select('refId')
      .lean();
    return new Set(rows.map((r) => r.refId));
  }

  async #markRead(ctx, refType, refId) {
    await ReadReceipt.updateOne(
      { userId: String(ctx.teacherId), refType, refId: String(refId) },
      { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'TEACHER', readAt: new Date() } },
      { upsert: true }
    );
  }
}

export const teacherInboxService = new TeacherInboxService();
