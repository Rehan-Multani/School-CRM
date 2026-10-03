import { Enquiry } from '../models/Enquiry.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

export class EnquiryRepository {
  async list({ search, status, sort, page = 1, limit = 20 }) {
    const query = {};

    // Only the two real statuses reach the query (never a raw query-string object).
    if (status === 'Pending' || status === 'Contacted') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const escaped = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { schoolName: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { message: { $regex: escaped, $options: 'i' } },
      ];
    }

    const { page: safePage, limit: safeLimit, skip } = sanitizePagination({
      page,
      limit,
      maxLimit: 100,
      defaultLimit: 20,
    });

    const [items, total] = await Promise.all([
      // `oldest` = the follow-up queue: whoever has waited longest comes first.
      Enquiry.find(query).sort({ createdAt: sort === 'oldest' ? 1 : -1 }).skip(skip).limit(safeLimit),
      Enquiry.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  async stats() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [total, pending, contacted, last7Days, overdue] = await Promise.all([
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: 'Pending' }),
      Enquiry.countDocuments({ status: 'Contacted' }),
      Enquiry.countDocuments({ createdAt: { $gte: weekAgo } }),
      // The contact page promises a reply within 24 hours.
      Enquiry.countDocuments({ status: 'Pending', createdAt: { $lt: dayAgo } }),
    ]);

    return { total, pending, contacted, last7Days, overdue };
  }

  create(payload) {
    return Enquiry.create(payload);
  }

  findById(id) {
    return Enquiry.findById(id);
  }

  save(enquiry) {
    return enquiry.save();
  }

  deleteById(id) {
    return Enquiry.findByIdAndDelete(id);
  }
}

export const enquiryRepository = new EnquiryRepository();
