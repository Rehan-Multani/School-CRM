import mongoose from 'mongoose';
import { Role } from '../models/Role.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { escapeRegex } from '../../../shared/sanitize.js';

class RoleRepository {
  async list(schoolId) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const [roles, counts] = await Promise.all([
      Role.find({ schoolId }).sort({ isSystem: -1, name: 1 }),
      SchoolUser.aggregate([
        { $match: { schoolId: sId, roleId: { $ne: null } } },
        { $group: { _id: '$roleId', count: { $sum: 1 } } },
      ]),
    ]);
    const map = {};
    counts.forEach((c) => {
      if (c._id) map[c._id.toString()] = c.count;
    });
    return roles.map((r) => r.toPublicJSON({ userCount: map[r._id.toString()] || 0 }));
  }

  findById(schoolId, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Role.findOne({ schoolId, _id: id });
  }

  findByKey(schoolId, key) {
    return Role.findOne({ schoolId, key: new RegExp(`^${escapeRegex(String(key).trim())}$`, 'i') });
  }

  create(schoolId, data) {
    return Role.create({ ...data, schoolId });
  }

  update(schoolId, id, data) {
    return Role.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  remove(schoolId, id) {
    return Role.findOneAndDelete({ schoolId, _id: id });
  }

  countUsers(schoolId, roleId) {
    return SchoolUser.countDocuments({ schoolId, roleId });
  }

  assignToUser(schoolId, userId, roleId, roleName) {
    return SchoolUser.findOneAndUpdate(
      { schoolId, _id: userId },
      { $set: { roleId: roleId || null, roleName: roleName || '' } },
      { new: true }
    );
  }
}

export const roleRepository = new RoleRepository();
