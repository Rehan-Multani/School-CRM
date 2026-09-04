import mongoose from 'mongoose';
import { Homework } from '../models/Homework.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

function buildFilter(schoolId, query = {}) {
  const filter = { schoolId };
  if (query.classId) filter.classId = query.classId;
  if (query.sectionId) filter.sectionId = query.sectionId;
  if (query.subjectId) filter.subjectId = query.subjectId;
  if (query.teacherId) filter.teacherId = query.teacherId;
  if (query.status && query.status !== 'ALL') filter.status = String(query.status).toUpperCase();
  if (query.from || query.to) {
    filter.assignedDate = {};
    if (query.from) filter.assignedDate.$gte = new Date(query.from);
    if (query.to) filter.assignedDate.$lte = new Date(query.to);
  }
  if (query.search?.trim()) {
    const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
    filter.$or = [
      { title: regex },
      { subjectName: regex },
      { teacherName: regex },
      { className: regex },
    ];
  }
  return filter;
}

class HomeworkRepository {
  async list(schoolId, query = {}) {
    const filter = buildFilter(schoolId, query);
    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 100,
      maxLimit: 500,
    });
    const [items, total] = await Promise.all([
      Homework.find(filter).sort({ assignedDate: -1 }).skip(skip).limit(limit),
      Homework.countDocuments(filter),
    ]);
    return { items: items.map((i) => i.toPublicJSON()), total, page, limit };
  }

  async findById(schoolId, id) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Homework.findOne({ schoolId, _id: id });
  }

  async create(schoolId, data) {
    return Homework.create({ ...data, schoolId });
  }

  async update(schoolId, id, data) {
    return Homework.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  async remove(schoolId, id) {
    return Homework.findOneAndDelete({ schoolId, _id: id });
  }

  async stats(schoolId, query = {}) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const base = buildFilter(sId, query);
    const now = new Date();
    const [agg, overdue] = await Promise.all([
      Homework.aggregate([
        { $match: base },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            assigned: { $sum: { $cond: [{ $eq: ['$status', 'ASSIGNED'] }, 1, 0] } },
            closed: { $sum: { $cond: [{ $eq: ['$status', 'CLOSED'] }, 1, 0] } },
            totalStudents: { $sum: '$totalStudents' },
            submitted: { $sum: '$submittedCount' },
            evaluated: { $sum: '$evaluatedCount' },
          },
        },
      ]),
      Homework.countDocuments({ ...base, status: 'ASSIGNED', dueDate: { $lt: now } }),
    ]);
    const a = agg[0] || { total: 0, assigned: 0, closed: 0, totalStudents: 0, submitted: 0, evaluated: 0 };
    return {
      total: a.total,
      assigned: a.assigned,
      closed: a.closed,
      overdue,
      avgSubmissionRate: a.totalStudents > 0 ? Math.round((a.submitted / a.totalStudents) * 100) : null,
      avgEvaluationRate: a.submitted > 0 ? Math.round((a.evaluated / a.submitted) * 100) : null,
      pendingEvaluation: Math.max(0, a.submitted - a.evaluated),
    };
  }

  async monitor(schoolId, query = {}) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const base = buildFilter(sId, query);
    const groupField =
      query.groupBy === 'subject'
        ? { key: '$subjectName', label: '$subjectName' }
        : query.groupBy === 'teacher'
        ? { key: '$teacherName', label: '$teacherName' }
        : { key: { $concat: ['$className', ' ', '$sectionName'] }, label: { $concat: ['$className', ' ', '$sectionName'] } };

    const rows = await Homework.aggregate([
      { $match: base },
      {
        $group: {
          _id: groupField.key,
          label: { $first: groupField.label },
          assignments: { $sum: 1 },
          totalStudents: { $sum: '$totalStudents' },
          submitted: { $sum: '$submittedCount' },
          evaluated: { $sum: '$evaluatedCount' },
          pendingEvaluation: { $sum: { $subtract: ['$submittedCount', '$evaluatedCount'] } },
        },
      },
      { $sort: { assignments: -1 } },
      { $limit: 100 },
    ]);

    return rows.map((r) => ({
      group: (r.label || r._id || '—').trim() || '—',
      assignments: r.assignments,
      submissionRate: r.totalStudents > 0 ? Math.round((r.submitted / r.totalStudents) * 100) : null,
      evaluationRate: r.submitted > 0 ? Math.round((r.evaluated / r.submitted) * 100) : null,
      pendingEvaluation: Math.max(0, r.pendingEvaluation || 0),
    }));
  }
}

export const homeworkRepository = new HomeworkRepository();
