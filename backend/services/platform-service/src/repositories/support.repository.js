import { SupportTicket } from '../models/SupportTicket.js';

export class SupportRepository {
  async nextTicketNo() {
    const count = await SupportTicket.countDocuments();
    return `TCK-${String(count + 1).padStart(4, '0')}`;
  }

  async list({ search, status, priority, schoolId, page = 1, limit = 20 }) {
    const query = {};

    if (status && status !== 'All') query.status = status;
    if (priority && priority !== 'All') query.priority = priority;
    if (schoolId) query.schoolId = String(schoolId).toLowerCase();

    if (search) {
      query.$or = [
        { ticketNo: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { schoolName: { $regex: search, $options: 'i' } },
      ];
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      SupportTicket.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
      SupportTicket.countDocuments(query),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  }

  async stats(schoolId) {
    const match = schoolId ? { schoolId: String(schoolId).toLowerCase() } : {};
    const [open, inProgress, resolved, closed, critical] = await Promise.all([
      SupportTicket.countDocuments({ ...match, status: 'Open' }),
      SupportTicket.countDocuments({ ...match, status: 'In Progress' }),
      SupportTicket.countDocuments({ ...match, status: 'Resolved' }),
      SupportTicket.countDocuments({ ...match, status: 'Closed' }),
      SupportTicket.countDocuments({ ...match, priority: 'Critical', status: { $in: ['Open', 'In Progress'] } }),
    ]);

    return { open, inProgress, resolved, closed, critical, total: open + inProgress + resolved + closed };
  }

  create(payload) {
    return SupportTicket.create(payload);
  }

  findById(id) {
    return SupportTicket.findById(id);
  }

  save(ticket) {
    return ticket.save();
  }
}

export const supportRepository = new SupportRepository();
