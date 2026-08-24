import mongoose from 'mongoose';
import { BookCopy } from '../models/BookCopy.js';
import { LibraryBook } from '../models/LibraryBook.js';

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
}

class BookCopyRepository {
  async listCopies(schoolId, query = {}) {
    const filter = { schoolId: toObjectId(schoolId) };

    if (query.bookId) {
      filter.bookId = toObjectId(query.bookId);
    }

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }

    if (query.condition && query.condition !== 'ALL') {
      filter.condition = query.condition.toUpperCase();
    }

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { accessionNumber: regex },
        { barcode: regex },
        { rackNumber: regex },
        { shelfNumber: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 100));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      BookCopy.find(filter)
        .populate('bookId', 'title author category isbn bookCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      BookCopy.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findCopyById(schoolId, id) {
    return BookCopy.findOne({
      schoolId: toObjectId(schoolId),
      _id: toObjectId(id),
    }).populate('bookId', 'title author category isbn bookCode price');
  }

  async findByAccessionNumber(schoolId, accessionNumber) {
    return BookCopy.findOne({
      schoolId: toObjectId(schoolId),
      accessionNumber: accessionNumber.trim(),
    });
  }

  async createCopy(data) {
    const copy = await BookCopy.create({
      ...data,
      schoolId: toObjectId(data.schoolId),
      bookId: toObjectId(data.bookId),
    });

    // Update parent book's totalCopies & availableCopies count
    await this.syncBookCopyCounts(data.schoolId, data.bookId);
    return copy;
  }

  // Atomically claims ONE currently-AVAILABLE copy of a book and flips it to newStatus in a
  // single conditional update, so concurrent callers (e.g. two reservation approvals racing
  // for the last copy) can't both succeed. Returns null if no copy was available to claim.
  async claimAvailableCopy(schoolId, bookId, newStatus) {
    const schoolObjId = toObjectId(schoolId);
    const bookObjId = toObjectId(bookId);

    const copy = await BookCopy.findOneAndUpdate(
      { schoolId: schoolObjId, bookId: bookObjId, status: 'AVAILABLE' },
      { $set: { status: newStatus } },
      { new: true }
    ).populate('bookId', 'title author category isbn bookCode price');

    if (copy) {
      await this.syncBookCopyCounts(schoolId, bookObjId);
    }
    return copy;
  }

  async updateCopy(schoolId, id, updates) {
    const copy = await BookCopy.findOneAndUpdate(
      { schoolId: toObjectId(schoolId), _id: toObjectId(id) },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('bookId', 'title author category isbn bookCode');

    if (copy) {
      await this.syncBookCopyCounts(schoolId, copy.bookId._id || copy.bookId);
    }
    return copy;
  }

  async deleteCopy(schoolId, id) {
    const copy = await BookCopy.findOne({
      schoolId: toObjectId(schoolId),
      _id: toObjectId(id),
    });
    if (!copy) return null;

    await BookCopy.deleteOne({ _id: copy._id });
    await this.syncBookCopyCounts(schoolId, copy.bookId);
    return copy;
  }

  async syncBookCopyCounts(schoolId, bookId) {
    const schoolObjId = toObjectId(schoolId);
    const bookObjId = toObjectId(bookId);

    const stats = await BookCopy.aggregate([
      { $match: { schoolId: schoolObjId, bookId: bookObjId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] },
          },
        },
      },
    ]);

    const totalCopies = stats[0]?.total || 0;
    const availableCopies = stats[0]?.available || 0;

    await LibraryBook.updateOne(
      { _id: bookObjId, schoolId: schoolObjId },
      {
        $set: {
          totalCopies,
          availableCopies,
          status: availableCopies > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
        },
      }
    );
  }

  async getCopiesStatsForBooks(schoolId, bookIds = []) {
    if (!bookIds.length) return {};
    const schoolObjId = toObjectId(schoolId);
    const objIds = bookIds.map(toObjectId).filter(Boolean);

    const results = await BookCopy.aggregate([
      { $match: { schoolId: schoolObjId, bookId: { $in: objIds } } },
      {
        $group: {
          _id: '$bookId',
          total: { $sum: 1 },
          available: {
            $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] },
          },
          issued: {
            $sum: { $cond: [{ $eq: ['$status', 'ISSUED'] }, 1, 0] },
          },
          lost: {
            $sum: { $cond: [{ $eq: ['$status', 'LOST'] }, 1, 0] },
          },
          damaged: {
            $sum: { $cond: [{ $eq: ['$status', 'DAMAGED'] }, 1, 0] },
          },
        },
      },
    ]);

    const map = {};
    for (const r of results) {
      map[r._id.toString()] = {
        totalCopies: r.total,
        availableCopies: r.available,
        issuedCopies: r.issued,
        lostCopies: r.lost,
        damagedCopies: r.damaged,
      };
    }
    return map;
  }
}

export const bookCopyRepository = new BookCopyRepository();
