import { AppError } from '../../../shared/AppError.js';
import { eventRepository } from '../repositories/event.repository.js';
import {
  EVENT_CATEGORIES,
  EVENT_AUDIENCES,
} from '../models/Event.js';

function cleanAudiences(input) {
  if (!Array.isArray(input) || input.length === 0) return ['ALL'];
  const valid = input
    .map((a) => String(a).toUpperCase())
    .filter((a) => EVENT_AUDIENCES.includes(a));
  return valid.length ? Array.from(new Set(valid)) : ['ALL'];
}

function validateDates(startAt, endAt) {
  const s = new Date(startAt);
  const e = new Date(endAt);
  if (Number.isNaN(s.getTime())) throw new AppError('A valid start date/time is required', 400);
  if (Number.isNaN(e.getTime())) throw new AppError('A valid end date/time is required', 400);
  if (e.getTime() < s.getTime()) {
    throw new AppError('Event end must be on or after the start', 400);
  }
  return { startAt: s, endAt: e };
}

class EventService {
  async list(schoolId, query = {}) {
    const { items, total, page, limit } = await eventRepository.list(schoolId, query);
    return { data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async stats(schoolId) {
    return eventRepository.stats(schoolId);
  }

  async get(schoolId, id) {
    const doc = await eventRepository.findById(schoolId, id);
    if (!doc) throw new AppError('Event not found', 404);
    return doc.toPublicJSON();
  }

  async create(schoolId, payload = {}, actorName = '') {
    const title = (payload.title || '').trim();
    if (!title) throw new AppError('Event title is required', 400);

    const { startAt, endAt } = validateDates(payload.startAt, payload.endAt);

    const category = EVENT_CATEGORIES.includes(String(payload.category).toUpperCase())
      ? String(payload.category).toUpperCase()
      : 'OTHER';

    const doc = await eventRepository.create(schoolId, {
      title,
      description: (payload.description || '').trim(),
      category,
      startAt,
      endAt,
      allDay: Boolean(payload.allDay),
      venue: (payload.venue || '').trim(),
      audiences: cleanAudiences(payload.audiences),
      leadStaffId: payload.leadStaffId || null,
      leadName: (payload.leadName || '').trim(),
      attachments: Array.isArray(payload.attachments) ? payload.attachments : [],
      createdByName: actorName,
    });
    return doc.toPublicJSON();
  }

  async update(schoolId, id, payload = {}) {
    const existing = await eventRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Event not found', 404);

    const patch = {};
    if (payload.title !== undefined) {
      const t = (payload.title || '').trim();
      if (!t) throw new AppError('Event title cannot be empty', 400);
      patch.title = t;
    }
    if (payload.description !== undefined) patch.description = (payload.description || '').trim();
    if (payload.venue !== undefined) patch.venue = (payload.venue || '').trim();
    if (payload.allDay !== undefined) patch.allDay = Boolean(payload.allDay);
    if (payload.leadStaffId !== undefined) patch.leadStaffId = payload.leadStaffId || null;
    if (payload.leadName !== undefined) patch.leadName = (payload.leadName || '').trim();
    if (payload.audiences !== undefined) patch.audiences = cleanAudiences(payload.audiences);
    if (payload.attachments !== undefined) {
      patch.attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
    }
    if (payload.category !== undefined) {
      patch.category = EVENT_CATEGORIES.includes(String(payload.category).toUpperCase())
        ? String(payload.category).toUpperCase()
        : existing.category;
    }

    const nextStart = payload.startAt !== undefined ? payload.startAt : existing.startAt;
    const nextEnd = payload.endAt !== undefined ? payload.endAt : existing.endAt;
    if (payload.startAt !== undefined || payload.endAt !== undefined) {
      const { startAt, endAt } = validateDates(nextStart, nextEnd);
      patch.startAt = startAt;
      patch.endAt = endAt;
    }

    const doc = await eventRepository.update(schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async setCancelled(schoolId, id, cancelled) {
    const existing = await eventRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Event not found', 404);
    const doc = await eventRepository.update(schoolId, id, {
      manualStatus: cancelled ? 'CANCELLED' : '',
    });
    return doc.toPublicJSON();
  }

  async remove(schoolId, id) {
    const doc = await eventRepository.remove(schoolId, id);
    if (!doc) throw new AppError('Event not found', 404);
    return { success: true, message: 'Event deleted successfully' };
  }
}

export const eventService = new EventService();
