import { SchoolUser } from '../models/SchoolUser.js';
import { escapeRegex } from '../../../shared/sanitize.js';

class UserRepository {
  async findUserById(schoolId, id) {
    return SchoolUser.findOne({ schoolId, _id: id });
  }

  async findUserWithPassword(schoolId, id) {
    return SchoolUser.findOne({ schoolId, _id: id }).select('+passwordHash');
  }

  async findUserByEmail(schoolId, email) {
    return SchoolUser.findOne({
      schoolId,
      email: (email || '').trim().toLowerCase(),
    });
  }

  async findUserByEmployeeId(schoolId, employeeId) {
    return SchoolUser.findOne({
      schoolId,
      employeeId: (employeeId || '').trim(),
    });
  }

  async listUsers(schoolId, query = {}) {
    const filter = { schoolId };

    if (query.role && query.role !== 'ALL') {
      filter.role = query.role.toUpperCase();
    }

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }

    if (query.search?.trim()) {
      const safe = escapeRegex(query.search.trim());
      const regex = new RegExp(safe, 'i');
      filter.$or = [
        { name: regex },
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { employeeId: regex },
        { department: regex },
        { designation: regex },
        { phone: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 5));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SchoolUser.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SchoolUser.countDocuments(filter),
    ]);

    // Summary counts
    const [activeCount, inactiveCount, roleCounts] = await Promise.all([
      SchoolUser.countDocuments({ schoolId, status: 'ACTIVE' }),
      SchoolUser.countDocuments({ schoolId, status: 'INACTIVE' }),
      SchoolUser.aggregate([
        { $match: { schoolId } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
    ]);

    const roleStats = {
      TEACHER: 0,
      LIBRARIAN: 0,
      HR: 0,
      ACCOUNTANT: 0,
      TRANSPORT: 0,
    };
    roleCounts.forEach((r) => {
      if (roleStats[r._id] !== undefined) {
        roleStats[r._id] = r.count;
      }
    });

    return {
      items,
      total,
      page,
      limit,
      stats: {
        total: activeCount + inactiveCount,
        active: activeCount,
        inactive: inactiveCount,
        ...roleStats,
      },
    };
  }

  async createUser(data) {
    return SchoolUser.create(data);
  }

  async updateUser(schoolId, id, updates) {
    return SchoolUser.findOneAndUpdate(
      { schoolId, _id: id },
      { $set: updates },
      { new: true, runValidators: true }
    );
  }

  async deleteUser(schoolId, id) {
    return SchoolUser.findOneAndDelete({ schoolId, _id: id });
  }
}

export const userRepository = new UserRepository();
