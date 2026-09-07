import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { SchoolMessage } from '../models/Communication.js';
import { Teacher } from '../models/Teacher.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const threadKeyFor = (teacherId) => `teacher:${teacherId}`;

/**
 * Teacher <-> school-office messaging, backed by the existing SchoolMessage
 * model. Each teacher has exactly one thread, keyed `teacher:<teacherId>`, so a
 * teacher can only ever see their own conversation. direction IN = from teacher,
 * OUT = office reply.
 */
class TeacherMessagesService {
  #assertOwnThread(ctx, conversationId) {
    const key = String(conversationId || '');
    if (key !== threadKeyFor(ctx.teacherId)) {
      throw new AppError('Conversation not found', 404, TEACHER_ERR.NOT_FOUND);
    }
    return key;
  }

  async conversations(ctx) {
    const key = threadKeyFor(ctx.teacherId);
    const [last, unread, count] = await Promise.all([
      SchoolMessage.findOne({ schoolId: oid(ctx.schoolId), threadKey: key }).sort({ createdAt: -1 }).lean(),
      SchoolMessage.countDocuments({ schoolId: oid(ctx.schoolId), threadKey: key, direction: 'OUT', readAt: null }),
      SchoolMessage.countDocuments({ schoolId: oid(ctx.schoolId), threadKey: key }),
    ]);
    return [
      {
        id: key,
        title: 'School Office',
        lastMessage: last ? { body: last.body, direction: last.direction, createdAt: last.createdAt } : null,
        unread,
        messageCount: count,
      },
    ];
  }

  async messages(ctx, conversationId, query = {}) {
    const key = this.#assertOwnThread(ctx, conversationId);
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 30, maxLimit: 100 });
    const [rows, total] = await Promise.all([
      SchoolMessage.find({ schoolId: oid(ctx.schoolId), threadKey: key }).sort({ createdAt: 1 }).skip(skip).limit(limit),
      SchoolMessage.countDocuments({ schoolId: oid(ctx.schoolId), threadKey: key }),
    ]);
    // Teacher opened the thread → office replies are now read.
    await SchoolMessage.updateMany(
      { schoolId: oid(ctx.schoolId), threadKey: key, direction: 'OUT', readAt: null },
      { $set: { readAt: new Date() } }
    );
    return {
      data: rows.map((m) => m.toPublicJSON()),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async post(ctx, conversationId, payload = {}) {
    const key = this.#assertOwnThread(ctx, conversationId);
    const body = String(payload.body || payload.message || '').trim();
    if (!body) throw new AppError('Message body is required', 400, TEACHER_ERR.VALIDATION_ERROR);
    if (body.length > 4000) throw new AppError('Message is too long (max 4000 chars)', 400, TEACHER_ERR.VALIDATION_ERROR);
    const teacher = await Teacher.findOne({ _id: oid(ctx.teacherId), schoolId: oid(ctx.schoolId) }).select('name').lean();
    const msg = await SchoolMessage.create({
      schoolId: oid(ctx.schoolId),
      threadKey: key,
      fromName: teacher?.name || 'Teacher',
      fromRole: 'TEACHER',
      direction: 'IN',
      body,
    });
    return msg.toPublicJSON();
  }

  async markRead(ctx, messageId) {
    const msg = await SchoolMessage.findOne({ schoolId: oid(ctx.schoolId), _id: oid(messageId) });
    if (!msg || msg.threadKey !== threadKeyFor(ctx.teacherId)) {
      throw new AppError('Message not found', 404, TEACHER_ERR.NOT_FOUND);
    }
    if (!msg.readAt) {
      msg.readAt = new Date();
      await msg.save();
    }
    return { message: 'Marked as read' };
  }
}

export const teacherMessagesService = new TeacherMessagesService();
