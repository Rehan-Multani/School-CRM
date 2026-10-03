import { Faq } from '../models/Faq.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

export class FaqRepository {
  async listPublic() {
    return Faq.find({ isActive: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
  }

  async listAdmin({ search, category, status, page = 1, limit = 50 }) {
    const query = {};

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (category && typeof category === 'string' && category !== 'All') {
      query.category = category.trim();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const escaped = escapeRegex(search.trim());
      query.$or = [
        { question: { $regex: escaped, $options: 'i' } },
        { answer: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }

    const { page: safePage, limit: safeLimit, skip } = sanitizePagination({
      page,
      limit,
      maxLimit: 100,
      defaultLimit: 50,
    });

    const [items, total] = await Promise.all([
      Faq.find(query).sort({ order: 1, createdAt: -1 }).skip(skip).limit(safeLimit),
      Faq.countDocuments(query),
    ]);

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    };
  }

  findById(id) {
    return Faq.findById(id);
  }

  create(payload) {
    return Faq.create(payload);
  }

  insertMany(items) {
    return Faq.insertMany(items);
  }

  save(faq) {
    return faq.save();
  }

  deleteById(id) {
    return Faq.findByIdAndDelete(id);
  }

  countDocuments(query = {}) {
    return Faq.countDocuments(query);
  }
}

export const faqRepository = new FaqRepository();
