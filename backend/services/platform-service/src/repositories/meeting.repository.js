import mongoose from 'mongoose';
import { Meeting } from '../models/Meeting.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

class MeetingRepository {
  async list(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status && query.status !== 'ALL') filter.status = String(query.status).toUpperCase();
    if (query.type && query.type !== 'ALL') filter.type = String(query.type).toUpperCase();
    if (query.upcoming === 'true' || query.upcoming === true) {
      filter.status = 'SCHEDULED';
      filter.scheduledAt = { $gte: new Date() };
    }
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [{ title: regex }, { agenda: regex }, { participantsLabel: regex }, { venue: regex }];
    }

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 100,
      maxLimit: 500,
    });

    const sortDir = query.upcoming ? 1 : -1;
    const [items, total, statsAgg] = await Promise.all([
      Meeting.find(filter).sort({ scheduledAt: sortDir }).skip(skip).limit(limit),
      Meeting.countDocuments(filter),
      Meeting.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const stats = { TOTAL: 0, SCHEDULED: 0, COMPLETED: 0, CANCELLED: 0 };
    statsAgg.forEach((s) => {
      stats[s._id] = s.count;
      stats.TOTAL += s.count;
    });

    return { items: items.map((i) => i.toPublicJSON()), total, page, limit, stats };
  }

  async findById(schoolId, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Meeting.findOne({ schoolId, _id: id });
  }

  async create(schoolId, data) {
    return Meeting.create({ ...data, schoolId });
  }

  async update(schoolId, id, data) {
    return Meeting.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  async remove(schoolId, id) {
    return Meeting.findOneAndDelete({ schoolId, _id: id });
  }
}

export const meetingRepository = new MeetingRepository();
