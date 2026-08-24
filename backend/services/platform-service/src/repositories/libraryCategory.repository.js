import mongoose from 'mongoose';
import { LibraryCategory } from '../models/LibraryCategory.js';
import { LibraryBook } from '../models/LibraryBook.js';
import { escapeRegex } from '../../../shared/sanitize.js';

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
}

class LibraryCategoryRepository {
  async listCategories(schoolId) {
    return LibraryCategory.find({ schoolId: toObjectId(schoolId) }).sort({ name: 1 });
  }

  async findById(schoolId, id) {
    return LibraryCategory.findOne({ schoolId: toObjectId(schoolId), _id: toObjectId(id) });
  }

  async findByName(schoolId, name, excludeId = null) {
    const filter = {
      schoolId: toObjectId(schoolId),
      name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    };
    if (excludeId) filter._id = { $ne: toObjectId(excludeId) };
    return LibraryCategory.findOne(filter);
  }

  async createCategory(data) {
    return LibraryCategory.create(data);
  }

  async updateCategory(schoolId, id, updates) {
    return LibraryCategory.findOneAndUpdate(
      { schoolId: toObjectId(schoolId), _id: toObjectId(id) },
      { $set: updates },
      { new: true, runValidators: true }
    );
  }

  async deleteCategory(schoolId, id) {
    return LibraryCategory.findOneAndDelete({ schoolId: toObjectId(schoolId), _id: toObjectId(id) });
  }

  // Map of UPPERCASE category name -> book stats for a school
  async getBookStatsByCategory(schoolId) {
    const schoolObjId = toObjectId(schoolId);
    const rows = await LibraryBook.aggregate([
      { $match: { schoolId: schoolObjId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' },
        },
      },
    ]);

    const map = {};
    rows.forEach((row) => {
      const key = (row._id || '').toUpperCase();
      map[key] = {
        count: row.count,
        totalCopies: row.totalCopies,
        availableCopies: row.availableCopies,
      };
    });
    return map;
  }

  async renameBooksCategory(schoolId, oldName, newName) {
    return LibraryBook.updateMany(
      { schoolId: toObjectId(schoolId), category: oldName.toUpperCase() },
      { $set: { category: newName.toUpperCase() } }
    );
  }
}

export const libraryCategoryRepository = new LibraryCategoryRepository();
