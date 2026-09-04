import { AppError } from '../../../shared/AppError.js';
import { communicationRepository } from '../repositories/communication.repository.js';
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_STATUSES,
  BROADCAST_CHANNELS,
} from '../models/Communication.js';
import { notificationService } from './notification.service.js';

const AUDIENCE_TO_ROLES = {
  ALL: ['principal', 'school-admin', 'accountant', 'teacher', 'student', 'parent', 'hr', 'librarian', 'transport'],
  TEACHERS: ['teacher'],
  STUDENTS: ['student'],
  PARENTS: ['parent'],
  STAFF: ['principal', 'school-admin', 'accountant', 'hr', 'librarian', 'transport'],
};

function cleanAudiences(input) {
  if (!Array.isArray(input) || !input.length) return ['ALL'];
  const valid = input.map((a) => String(a).toUpperCase()).filter((a) => ANNOUNCEMENT_AUDIENCES.includes(a));
  return valid.length ? Array.from(new Set(valid)) : ['ALL'];
}
function rolesFor(audiences) {
  const set = new Set();
  audiences.forEach((a) => (AUDIENCE_TO_ROLES[a] || []).forEach((r) => set.add(r)));
  return Array.from(set);
}

class CommunicationService {
  // ---- announcements ----
  async listAnnouncements(schoolId, query = {}) {
    const { items, total, page, limit } = await communicationRepository.listAnnouncements(schoolId, query);
    return { data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async createAnnouncement(schoolId, payload = {}, actorName = '', schoolObjectId = '') {
    const title = (payload.title || '').trim();
    if (!title) throw new AppError('Announcement title is required', 400);
    const audiences = cleanAudiences(payload.audiences);
    const publishAt = payload.publishAt ? new Date(payload.publishAt) : null;
    const expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
    if (publishAt && expiresAt && expiresAt.getTime() < publishAt.getTime()) {
      throw new AppError('Expiry must be after the publish time', 400);
    }
    const publishNow = payload.publish === true || payload.status === 'PUBLISHED';
    const doc = await communicationRepository.createAnnouncement(schoolId, {
      title,
      body: (payload.body || '').trim(),
      audiences,
      publishedByName: actorName,
      publishAt: publishNow ? publishAt || new Date() : publishAt,
      expiresAt,
      status: publishNow ? 'PUBLISHED' : 'DRAFT',
      pinned: Boolean(payload.pinned),
    });
    if (publishNow) await this._fanOut(doc, schoolObjectId);
    return doc.toPublicJSON();
  }

  async updateAnnouncement(schoolId, id, payload = {}) {
    const existing = await communicationRepository.findAnnouncement(schoolId, id);
    if (!existing) throw new AppError('Announcement not found', 404);
    const patch = {};
    if (payload.title !== undefined) {
      const t = (payload.title || '').trim();
      if (!t) throw new AppError('Title cannot be empty', 400);
      patch.title = t;
    }
    if (payload.body !== undefined) patch.body = (payload.body || '').trim();
    if (payload.audiences !== undefined) patch.audiences = cleanAudiences(payload.audiences);
    if (payload.pinned !== undefined) patch.pinned = Boolean(payload.pinned);
    if (payload.expiresAt !== undefined) patch.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
    if (payload.status !== undefined && ANNOUNCEMENT_STATUSES.includes(String(payload.status).toUpperCase())) {
      patch.status = String(payload.status).toUpperCase();
    }
    const doc = await communicationRepository.updateAnnouncement(schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async publishAnnouncement(schoolId, id, schoolObjectId = '') {
    const existing = await communicationRepository.findAnnouncement(schoolId, id);
    if (!existing) throw new AppError('Announcement not found', 404);
    if (!existing.audiences?.length) throw new AppError('Select at least one audience before publishing', 400);
    const doc = await communicationRepository.updateAnnouncement(schoolId, id, {
      status: 'PUBLISHED',
      publishAt: existing.publishAt || new Date(),
    });
    await this._fanOut(doc, schoolObjectId);
    return doc.toPublicJSON();
  }

  async deleteAnnouncement(schoolId, id) {
    const doc = await communicationRepository.deleteAnnouncement(schoolId, id);
    if (!doc) throw new AppError('Announcement not found', 404);
    return { success: true, message: 'Announcement deleted' };
  }

  async _fanOut(announcement, schoolObjectId) {
    try {
      await notificationService.send(
        {
          title: announcement.title,
          body: announcement.body || announcement.title,
          audiences: rolesFor(announcement.audiences || ['ALL']),
        },
        announcement.publishedByName || 'School Admin',
        schoolObjectId ? { schoolId: schoolObjectId } : {}
      );
    } catch {
      /* push failure must not break publishing */
    }
  }

  // ---- broadcasts ----
  async listBroadcasts(schoolId, query = {}) {
    const { items, total, page, limit } = await communicationRepository.listBroadcasts(schoolId, query);
    return { data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async createBroadcast(schoolId, payload = {}, actorName = '', schoolObjectId = '') {
    const content = (payload.content || '').trim();
    if (!content) throw new AppError('Broadcast content is required', 400);
    const channel = BROADCAST_CHANNELS.includes(String(payload.channel).toUpperCase())
      ? String(payload.channel).toUpperCase()
      : 'SMS';
    const audienceLabel = (payload.audienceLabel || 'All').trim();

    let delivered = 0;
    let status = 'SENT';
    let note = '';
    if (channel === 'PUSH') {
      try {
        const res = await notificationService.send(
          { title: `School broadcast`, body: content, audiences: ['school-admin', 'teacher', 'parent', 'student'] },
          actorName,
          schoolObjectId ? { schoolId: schoolObjectId } : {}
        );
        delivered = res?.delivery?.success || 0;
      } catch {
        status = 'SENT';
        note = 'Push queued (delivery service unavailable)';
      }
    } else {
      note = `${channel} gateway not configured — logged only`;
    }

    const doc = await communicationRepository.createBroadcast(schoolId, {
      channel,
      audienceLabel,
      content,
      status,
      sentByName: actorName,
      stats: { targeted: 0, delivered },
      note,
    });
    return doc.toPublicJSON();
  }

  // ---- messages ----
  listThreads(schoolId) {
    return communicationRepository.listThreads(schoolId).then((data) => ({ data }));
  }

  async getThread(schoolId, threadKey) {
    const messages = await communicationRepository.listThreadMessages(schoolId, threadKey);
    if (!messages.length) throw new AppError('Conversation not found', 404);
    await communicationRepository.markThreadRead(schoolId, threadKey);
    return { data: messages.map((m) => ({ ...m, readAt: m.readAt || new Date() })) };
  }

  async reply(schoolId, threadKey, payload = {}, actorName = '') {
    const body = (payload.body || '').trim();
    if (!body) throw new AppError('Reply cannot be empty', 400);
    const exists = await communicationRepository.threadExists(schoolId, threadKey);
    if (!exists) throw new AppError('Conversation not found', 404);
    const doc = await communicationRepository.createMessage(schoolId, {
      threadKey,
      fromName: actorName || 'School Admin',
      fromRole: 'SCHOOLADMIN',
      direction: 'OUT',
      body,
      readAt: new Date(),
    });
    await communicationRepository.markThreadRead(schoolId, threadKey);
    return doc.toPublicJSON();
  }

  // used for demo / inbound seeding
  async inbound(schoolId, payload = {}) {
    const body = (payload.body || '').trim();
    if (!body) throw new AppError('Message body required', 400);
    const threadKey = (payload.threadKey || `staff-${Date.now()}`).trim();
    const doc = await communicationRepository.createMessage(schoolId, {
      threadKey,
      fromName: (payload.fromName || 'Staff Member').trim(),
      fromRole: (payload.fromRole || 'TEACHER').trim(),
      direction: 'IN',
      body,
    });
    return doc.toPublicJSON();
  }
}

export const communicationService = new CommunicationService();
