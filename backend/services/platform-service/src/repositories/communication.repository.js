import mongoose from 'mongoose';
import { Announcement, BroadcastAlert, SchoolMessage } from '../models/Communication.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

class CommunicationRepository {
  // ---- announcements ----
  async listAnnouncements(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status && query.status !== 'ALL') filter.status = String(query.status).toUpperCase();
    else filter.status = { $ne: 'ARCHIVED' };
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [{ title: regex }, { body: regex }];
    }
    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 100,
      maxLimit: 300,
    });
    const [items, total] = await Promise.all([
      Announcement.find(filter).sort({ pinned: -1, createdAt: -1 }).skip(skip).limit(limit),
      Announcement.countDocuments(filter),
    ]);
    return { items: items.map((i) => i.toPublicJSON()), total, page, limit };
  }

  findAnnouncement(schoolId, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Announcement.findOne({ schoolId, _id: id });
  }
  createAnnouncement(schoolId, data) {
    return Announcement.create({ ...data, schoolId });
  }
  updateAnnouncement(schoolId, id, data) {
    return Announcement.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }
  deleteAnnouncement(schoolId, id) {
    return Announcement.findOneAndDelete({ schoolId, _id: id });
  }

  // ---- broadcasts ----
  async listBroadcasts(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.channel && query.channel !== 'ALL') filter.channel = String(query.channel).toUpperCase();
    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 100,
      maxLimit: 300,
    });
    const [items, total] = await Promise.all([
      BroadcastAlert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      BroadcastAlert.countDocuments(filter),
    ]);
    return { items: items.map((i) => i.toPublicJSON()), total, page, limit };
  }
  createBroadcast(schoolId, data) {
    return BroadcastAlert.create({ ...data, schoolId });
  }

  // ---- messages ----
  async listThreads(schoolId) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const rows = await SchoolMessage.aggregate([
      { $match: { schoolId: sId } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$threadKey',
          fromName: { $first: '$fromName' },
          fromRole: { $first: '$fromRole' },
          lastBody: { $first: '$body' },
          lastAt: { $first: '$createdAt' },
          lastDirection: { $first: '$direction' },
          unread: {
            $sum: { $cond: [{ $and: [{ $eq: ['$direction', 'IN'] }, { $eq: ['$readAt', null] }] }, 1, 0] },
          },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: 200 },
    ]);
    return rows.map((r) => ({
      threadKey: r._id,
      fromName: r.fromName || 'Staff',
      fromRole: r.fromRole || '',
      lastBody: r.lastBody || '',
      lastAt: r.lastAt,
      lastDirection: r.lastDirection,
      unread: r.unread,
    }));
  }

  async listThreadMessages(schoolId, threadKey) {
    const items = await SchoolMessage.find({ schoolId, threadKey }).sort({ createdAt: 1 });
    return items.map((i) => i.toPublicJSON());
  }

  createMessage(schoolId, data) {
    return SchoolMessage.create({ ...data, schoolId });
  }

  markThreadRead(schoolId, threadKey) {
    return SchoolMessage.updateMany(
      { schoolId, threadKey, direction: 'IN', readAt: null },
      { $set: { readAt: new Date() } }
    );
  }

  threadExists(schoolId, threadKey) {
    return SchoolMessage.exists({ schoolId, threadKey });
  }
}

export const communicationRepository = new CommunicationRepository();
