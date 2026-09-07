import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Announcement } from '../models/Communication.js';
import { Event } from '../models/Event.js';
import { ReadReceipt } from '../models/ReadReceipt.js';
import { noticeLite, eventLite } from '../serializers/student.serializers.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const STUDENT_AUDIENCES = ['ALL', 'STUDENTS'];

class StudentNoticeService {
  /* ------------------------------ NOTICES ------------------------------ */
  #noticeFilter(ctx) {
    const now = new Date();
    return {
      schoolId: oid(ctx.schoolId),
      status: 'PUBLISHED',
      audiences: { $in: STUDENT_AUDIENCES },
      $and: [
        { $or: [{ publishAt: null }, { publishAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
      ],
    };
  }

  async notices(ctx, query = {}) {
    const filter = this.#noticeFilter(ctx);
    if (query.category) {
      filter.audiences = { $in: [String(query.category).toUpperCase(), ...STUDENT_AUDIENCES] };
    }
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      Announcement.find(filter).sort({ pinned: -1, createdAt: -1 }).skip(skip).limit(limit),
      Announcement.countDocuments(filter),
    ]);
    const readSet = await this.#readSet(ctx.studentId, 'ANNOUNCEMENT', rows.map((r) => String(r._id)));
    const unread = await this.#unreadNoticeCount(ctx);
    return {
      data: rows.map((r) => noticeLite(r.toPublicJSON(), readSet.has(String(r._id)))),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      meta: { unread },
    };
  }

  async notice(ctx, id) {
    const row = await Announcement.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id), status: 'PUBLISHED' });
    if (!row || !(row.audiences || []).some((a) => STUDENT_AUDIENCES.includes(a))) {
      throw new AppError('Notice not found', 404, STUDENT_ERR.NOT_FOUND);
    }
    const readSet = await this.#readSet(ctx.studentId, 'ANNOUNCEMENT', [String(row._id)]);
    return noticeLite(row.toPublicJSON(), readSet.has(String(row._id)));
  }

  async markNoticeRead(ctx, id) {
    const row = await Announcement.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id) }).select('_id audiences').lean();
    if (!row || !(row.audiences || []).some((a) => STUDENT_AUDIENCES.includes(a))) {
      throw new AppError('Notice not found', 404, STUDENT_ERR.NOT_FOUND);
    }
    await this.#markRead(ctx, 'ANNOUNCEMENT', id);
    return { message: 'Marked as read' };
  }

  async markAllNoticesRead(ctx) {
    const rows = await Announcement.find(this.#noticeFilter(ctx)).select('_id').lean();
    if (!rows.length) return { marked: 0 };
    const ops = rows.map((r) => ({
      updateOne: {
        filter: { userId: String(ctx.studentId), refType: 'ANNOUNCEMENT', refId: String(r._id) },
        update: { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'STUDENT', readAt: new Date() } },
        upsert: true,
      },
    }));
    const res = await ReadReceipt.bulkWrite(ops, { ordered: false });
    return { marked: res.upsertedCount ?? 0 };
  }

  async #unreadNoticeCount(ctx) {
    const rows = await Announcement.find(this.#noticeFilter(ctx)).select('_id').lean();
    if (!rows.length) return 0;
    const readSet = await this.#readSet(ctx.studentId, 'ANNOUNCEMENT', rows.map((r) => String(r._id)));
    return rows.filter((r) => !readSet.has(String(r._id))).length;
  }

  /* ------------------------------- EVENTS ------------------------------- */
  async events(ctx, query = {}) {
    const scope = String(query.scope || 'upcoming').toLowerCase();
    const now = new Date();
    const filter = { schoolId: oid(ctx.schoolId), audiences: { $in: STUDENT_AUDIENCES } };
    if (scope === 'past') filter.endAt = { $lt: now };
    else filter.endAt = { $gte: now };
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
    if (!row || !(row.audiences || []).some((a) => STUDENT_AUDIENCES.includes(a))) {
      throw new AppError('Event not found', 404, STUDENT_ERR.NOT_FOUND);
    }
    return eventLite(row.toPublicJSON());
  }

  /* ------------------------------- shared ------------------------------- */
  async #readSet(studentId, refType, ids) {
    if (!ids.length) return new Set();
    const rows = await ReadReceipt.find({ userId: String(studentId), refType, refId: { $in: ids } })
      .select('refId')
      .lean();
    return new Set(rows.map((r) => r.refId));
  }

  async #markRead(ctx, refType, refId) {
    await ReadReceipt.updateOne(
      { userId: String(ctx.studentId), refType, refId: String(refId) },
      { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'STUDENT', readAt: new Date() } },
      { upsert: true }
    );
  }
}

export const studentNoticeService = new StudentNoticeService();
