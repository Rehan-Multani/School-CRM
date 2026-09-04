import mongoose from 'mongoose';
import { Event } from '../models/Event.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

class EventRepository {
  async list(schoolId, query = {}) {
    const filter = { schoolId };

    if (query.category && query.category !== 'ALL') {
      filter.category = String(query.category).toUpperCase();
    }
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [{ title: regex }, { venue: regex }, { leadName: regex }];
    }

    const now = new Date();
    if (query.status && query.status !== 'ALL') {
      const status = String(query.status).toUpperCase();
      if (status === 'CANCELLED') {
        filter.manualStatus = 'CANCELLED';
      } else if (status === 'UPCOMING') {
        filter.manualStatus = '';
        filter.startAt = { $gt: now };
      } else if (status === 'ONGOING') {
        filter.manualStatus = '';
        filter.startAt = { $lte: now };
        filter.endAt = { $gte: now };
      } else if (status === 'COMPLETED') {
        filter.manualStatus = '';
        filter.endAt = { $lt: now };
      }
    }
    if (query.from || query.to) {
      filter.startAt = filter.startAt || {};
      if (query.from) filter.startAt.$gte = new Date(query.from);
      if (query.to) filter.startAt.$lte = new Date(query.to);
    }

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 100,
      maxLimit: 500,
    });

    const [items, total] = await Promise.all([
      Event.find(filter).sort({ startAt: -1 }).skip(skip).limit(limit),
      Event.countDocuments(filter),
    ]);

    return {
      items: items.map((i) => i.toPublicJSON()),
      total,
      page,
      limit,
    };
  }

  async findById(schoolId, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Event.findOne({ schoolId, _id: id });
  }

  async create(schoolId, data) {
    return Event.create({ ...data, schoolId });
  }

  async update(schoolId, id, data) {
    return Event.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  async remove(schoolId, id) {
    return Event.findOneAndDelete({ schoolId, _id: id });
  }

  async stats(schoolId) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const sId = new mongoose.Types.ObjectId(schoolId);

    const [total, upcoming, thisMonth, completed, cancelled] = await Promise.all([
      Event.countDocuments({ schoolId: sId }),
      Event.countDocuments({ schoolId: sId, manualStatus: '', startAt: { $gt: now } }),
      Event.countDocuments({
        schoolId: sId,
        startAt: { $gte: startOfMonth, $lte: endOfMonth },
      }),
      Event.countDocuments({ schoolId: sId, manualStatus: '', endAt: { $lt: now } }),
      Event.countDocuments({ schoolId: sId, manualStatus: 'CANCELLED' }),
    ]);

    return { total, upcoming, thisMonth, completed, cancelled };
  }

  async upcomingList(schoolId, limit = 5) {
    const now = new Date();
    const items = await Event.find({
      schoolId,
      manualStatus: '',
      startAt: { $gte: now },
    })
      .sort({ startAt: 1 })
      .limit(limit);
    return items.map((i) => i.toPublicJSON());
  }
}

export const eventRepository = new EventRepository();
