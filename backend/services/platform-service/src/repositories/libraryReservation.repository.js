import mongoose from 'mongoose';
import { LibraryReservation } from '../models/LibraryReservation.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { AppError } from '../../../shared/AppError.js';

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
}

class LibraryReservationRepository {
  async listReservations(schoolId, query = {}) {
    const filter = { schoolId: toObjectId(schoolId) };

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }

    if (query.bookId) {
      filter.bookId = toObjectId(query.bookId);
    }

    if (query.borrowerRefId) {
      filter.borrowerRefId = toObjectId(query.borrowerRefId);
    }

    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [
        { borrowerName: regex },
        { borrowerCode: regex },
        { borrowerClass: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 100));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      LibraryReservation.find(filter)
        .populate('bookId', 'title author category isbn bookCode')
        .sort({ reservedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LibraryReservation.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findById(schoolId, id) {
    return LibraryReservation.findOne({
      schoolId: toObjectId(schoolId),
      _id: toObjectId(id),
    }).populate('bookId', 'title author category isbn bookCode availableCopies totalCopies');
  }

  async createReservation(data) {
    try {
      return await LibraryReservation.create({
        ...data,
        schoolId: toObjectId(data.schoolId),
        bookId: toObjectId(data.bookId),
        borrowerRefId: toObjectId(data.borrowerRefId),
      });
    } catch (err) {
      // Duplicate-key from the partial unique index (schoolId+bookId+borrowerRefId, status: PENDING) —
      // this is the authoritative guard against a duplicate pending reservation, closing the race
      // window the service-layer pre-check alone can't close.
      if (err?.code === 11000) {
        throw new AppError('This borrower already has a pending reservation for this book.', 409);
      }
      throw err;
    }
  }

  async updateStatus(schoolId, id, status, updates = {}, expectedCurrentStatus = null) {
    const filter = { schoolId: toObjectId(schoolId), _id: toObjectId(id) };
    if (expectedCurrentStatus) filter.status = expectedCurrentStatus;
    const setFields = { status, ...updates };
    return LibraryReservation.findOneAndUpdate(
      filter,
      { $set: setFields },
      { new: true, runValidators: true }
    ).populate('bookId', 'title author category isbn bookCode');
  }

  async countPending(schoolId) {
    return LibraryReservation.countDocuments({
      schoolId: toObjectId(schoolId),
      status: 'PENDING',
    });
  }
}

export const libraryReservationRepository = new LibraryReservationRepository();
