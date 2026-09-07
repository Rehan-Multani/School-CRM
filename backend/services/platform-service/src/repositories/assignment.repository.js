import mongoose from 'mongoose';
import { Assignment } from '../models/Assignment.js';
import { AssignmentSubmission } from '../models/AssignmentSubmission.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

class AssignmentRepository {
  async list(schoolId, query = {}) {
    const filter = { schoolId: oid(schoolId) };
    if (query.teacherId) filter.teacherId = oid(query.teacherId);
    if (query.classId) filter.classId = oid(query.classId);
    if (query.sectionId) filter.sectionId = oid(query.sectionId);
    if (query.subjectId) filter.subjectId = oid(query.subjectId);
    if (query.status && query.status !== 'ALL') filter.status = String(query.status).toUpperCase();
    if (query.q?.trim()) {
      const rx = new RegExp(escapeRegex(query.q.trim()), 'i');
      filter.$or = [{ title: rx }, { subjectName: rx }, { className: rx }];
    }
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [items, total] = await Promise.all([
      Assignment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Assignment.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  findById(schoolId, id) {
    return Assignment.findOne({ schoolId: oid(schoolId), _id: oid(id) });
  }

  create(data) {
    return Assignment.create(data);
  }

  update(schoolId, id, patch) {
    return Assignment.findOneAndUpdate({ schoolId: oid(schoolId), _id: oid(id) }, { $set: patch }, { new: true });
  }

  remove(schoolId, id) {
    return Assignment.findOneAndDelete({ schoolId: oid(schoolId), _id: oid(id) });
  }

  submissions(schoolId, assignmentId) {
    return AssignmentSubmission.find({ schoolId: oid(schoolId), assignmentId: oid(assignmentId) }).lean();
  }

  submissionById(schoolId, id) {
    return AssignmentSubmission.findOne({ schoolId: oid(schoolId), _id: oid(id) });
  }

  async refreshCounts(schoolId, assignmentId) {
    const [submissionCount, gradedCount] = await Promise.all([
      AssignmentSubmission.countDocuments({ assignmentId: oid(assignmentId), status: { $in: ['SUBMITTED', 'LATE', 'GRADED'] } }),
      AssignmentSubmission.countDocuments({ assignmentId: oid(assignmentId), status: 'GRADED' }),
    ]);
    await Assignment.updateOne({ schoolId: oid(schoolId), _id: oid(assignmentId) }, { $set: { submissionCount, gradedCount } });
    return { submissionCount, gradedCount };
  }

  deleteSubmissionsFor(assignmentId) {
    return AssignmentSubmission.deleteMany({ assignmentId: oid(assignmentId) });
  }
}

export const assignmentRepository = new AssignmentRepository();
