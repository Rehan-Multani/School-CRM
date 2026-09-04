import { AppError } from '../../../shared/AppError.js';
import { meetingRepository } from '../repositories/meeting.repository.js';
import { MEETING_TYPES, MEETING_MODES, MEETING_STATUSES } from '../models/Meeting.js';

function pickEnum(value, list, fallback) {
  const up = String(value || '').toUpperCase();
  return list.includes(up) ? up : fallback;
}

class MeetingService {
  async list(schoolId, query = {}) {
    const { items, total, page, limit, stats } = await meetingRepository.list(schoolId, query);
    return {
      data: items,
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async get(schoolId, id) {
    const doc = await meetingRepository.findById(schoolId, id);
    if (!doc) throw new AppError('Meeting not found', 404);
    return doc.toPublicJSON();
  }

  async create(schoolId, payload = {}, organizerName = '') {
    const title = (payload.title || '').trim();
    if (!title) throw new AppError('Meeting title is required', 400);
    const scheduledAt = new Date(payload.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new AppError('A valid date/time is required', 400);
    const durationMin = Number(payload.durationMin);
    if (payload.durationMin !== undefined && (!Number.isFinite(durationMin) || durationMin <= 0)) {
      throw new AppError('Duration must be a positive number of minutes', 400);
    }

    const doc = await meetingRepository.create(schoolId, {
      title,
      agenda: (payload.agenda || '').trim(),
      type: pickEnum(payload.type, MEETING_TYPES, 'STAFF'),
      scheduledAt,
      durationMin: Number.isFinite(durationMin) && durationMin > 0 ? Math.floor(durationMin) : 30,
      mode: pickEnum(payload.mode, MEETING_MODES, 'IN_PERSON'),
      venue: (payload.venue || '').trim(),
      meetingLink: (payload.meetingLink || '').trim(),
      organizerName: organizerName || (payload.organizerName || '').trim(),
      participantsLabel: (payload.participantsLabel || '').trim(),
      status: 'SCHEDULED',
    });
    return doc.toPublicJSON();
  }

  async update(schoolId, id, payload = {}) {
    const existing = await meetingRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Meeting not found', 404);

    const patch = {};
    if (payload.title !== undefined) {
      const t = (payload.title || '').trim();
      if (!t) throw new AppError('Meeting title cannot be empty', 400);
      patch.title = t;
    }
    if (payload.agenda !== undefined) patch.agenda = (payload.agenda || '').trim();
    if (payload.type !== undefined) patch.type = pickEnum(payload.type, MEETING_TYPES, existing.type);
    if (payload.mode !== undefined) patch.mode = pickEnum(payload.mode, MEETING_MODES, existing.mode);
    if (payload.venue !== undefined) patch.venue = (payload.venue || '').trim();
    if (payload.meetingLink !== undefined) patch.meetingLink = (payload.meetingLink || '').trim();
    if (payload.participantsLabel !== undefined) {
      patch.participantsLabel = (payload.participantsLabel || '').trim();
    }
    if (payload.minutes !== undefined) patch.minutes = (payload.minutes || '').trim();
    if (payload.scheduledAt !== undefined) {
      const d = new Date(payload.scheduledAt);
      if (Number.isNaN(d.getTime())) throw new AppError('A valid date/time is required', 400);
      patch.scheduledAt = d;
    }
    if (payload.durationMin !== undefined) {
      const n = Number(payload.durationMin);
      if (!Number.isFinite(n) || n <= 0) throw new AppError('Duration must be positive', 400);
      patch.durationMin = Math.floor(n);
    }
    if (payload.status !== undefined) {
      patch.status = pickEnum(payload.status, MEETING_STATUSES, existing.status);
    }

    const doc = await meetingRepository.update(schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async setStatus(schoolId, id, status, minutes) {
    const next = pickEnum(status, MEETING_STATUSES, null);
    if (!next) throw new AppError('Invalid meeting status', 400);
    const existing = await meetingRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Meeting not found', 404);
    const patch = { status: next };
    if (next === 'COMPLETED' && minutes !== undefined) patch.minutes = (minutes || '').trim();
    const doc = await meetingRepository.update(schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async remove(schoolId, id) {
    const doc = await meetingRepository.remove(schoolId, id);
    if (!doc) throw new AppError('Meeting not found', 404);
    return { success: true, message: 'Meeting deleted successfully' };
  }
}

export const meetingService = new MeetingService();
