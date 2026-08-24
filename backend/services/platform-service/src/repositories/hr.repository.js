import mongoose from 'mongoose';
import { Department } from '../models/Department.js';
import { Designation } from '../models/Designation.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { HRSettings } from '../models/HRSettings.js';
import { PerformanceReview } from '../models/PerformanceReview.js';
import { EmployeeDocument } from '../models/EmployeeDocument.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { Teacher } from '../models/Teacher.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

class HRRepository {
  // ==========================================
  // HR SETTINGS
  // ==========================================
  async getSettings(schoolId) {
    let settings = await HRSettings.findOne({ schoolId });
    if (!settings) {
      settings = await HRSettings.create({ schoolId });
    }
    return settings;
  }

  async updateSettings(schoolId, data) {
    const settings = await HRSettings.findOneAndUpdate(
      { schoolId },
      { $set: data },
      { new: true, upsert: true }
    );
    return settings;
  }

  // ==========================================
  // DEPARTMENTS
  // ==========================================
  async listDepartments(schoolId) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    
    // Aggregation to compute employeeCount dynamically without storing it
    const [departments, staffCounts, teacherCounts] = await Promise.all([
      Department.find({ schoolId }).sort({ name: 1 }),
      SchoolUser.aggregate([
        { $match: { schoolId: sId, status: 'ACTIVE' } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ]),
      Teacher.aggregate([
        { $match: { schoolId: sId, status: 'ACTIVE' } },
        { $group: { _id: '$department', count: { $sum: 1 } } }
      ])
    ]);

    const countMap = {};
    staffCounts.forEach((c) => {
      if (c._id) countMap[c._id.toLowerCase()] = (countMap[c._id.toLowerCase()] || 0) + c.count;
    });
    teacherCounts.forEach((c) => {
      if (c._id) countMap[c._id.toLowerCase()] = (countMap[c._id.toLowerCase()] || 0) + c.count;
    });

    return departments.map((dept) => {
      const count = countMap[dept.name.toLowerCase()] || 0;
      return dept.toPublicJSON({ employeeCount: count });
    });
  }

  async findDepartmentById(schoolId, id) {
    return Department.findOne({ schoolId, _id: id });
  }

  async findDepartmentByName(schoolId, name) {
    return Department.findOne({
      schoolId,
      name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i'),
    });
  }

  async createDepartment(schoolId, data) {
    return Department.create({ ...data, schoolId });
  }

  async updateDepartment(schoolId, id, data) {
    return Department.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  async deleteDepartment(schoolId, id) {
    return Department.findOneAndDelete({ schoolId, _id: id });
  }

  // ==========================================
  // DESIGNATIONS
  // ==========================================
  async listDesignations(schoolId, departmentId = null) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const filter = { schoolId };
    if (departmentId) filter.departmentId = departmentId;

    const [designations, staffCounts, teacherCounts] = await Promise.all([
      Designation.find(filter).populate('departmentId', 'name code').sort({ level: 1, title: 1 }),
      SchoolUser.aggregate([
        { $match: { schoolId: sId, status: 'ACTIVE' } },
        { $group: { _id: '$designation', count: { $sum: 1 } } }
      ]),
      Teacher.aggregate([
        { $match: { schoolId: sId, status: 'ACTIVE' } },
        { $group: { _id: '$designation', count: { $sum: 1 } } }
      ])
    ]);

    const countMap = {};
    staffCounts.forEach((c) => {
      if (c._id) countMap[c._id.toLowerCase()] = (countMap[c._id.toLowerCase()] || 0) + c.count;
    });
    teacherCounts.forEach((c) => {
      if (c._id) countMap[c._id.toLowerCase()] = (countMap[c._id.toLowerCase()] || 0) + c.count;
    });

    return designations.map((desig) => {
      const count = countMap[desig.title.toLowerCase()] || 0;
      return desig.toPublicJSON({ employeeCount: count });
    });
  }

  async findDesignationById(schoolId, id) {
    return Designation.findOne({ schoolId, _id: id }).populate('departmentId', 'name code');
  }

  async findDesignationByTitle(schoolId, title) {
    return Designation.findOne({
      schoolId,
      title: new RegExp(`^${escapeRegex(title.trim())}$`, 'i'),
    });
  }

  async createDesignation(schoolId, data) {
    return Designation.create({ ...data, schoolId });
  }

  async updateDesignation(schoolId, id, data) {
    return Designation.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true }).populate('departmentId', 'name code');
  }

  async deleteDesignation(schoolId, id) {
    return Designation.findOneAndDelete({ schoolId, _id: id });
  }

  // ==========================================
  // LEAVE REQUESTS
  // ==========================================
  async listLeaveRequests(schoolId, query = {}) {
    const filter = { schoolId };

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }
    if (query.leaveType && query.leaveType !== 'ALL') {
      filter.leaveType = query.leaveType.toUpperCase();
    }
    if (query.employeeRefId) {
      filter.employeeRefId = query.employeeRefId;
    }
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [{ employeeName: regex }, { employeeId: regex }, { department: regex }];
    }

    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit });

    const [items, total, statsAgg] = await Promise.all([
      LeaveRequest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      LeaveRequest.countDocuments(filter),
      LeaveRequest.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const stats = {
      TOTAL: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    statsAgg.forEach((s) => {
      stats[s._id] = s.count;
      stats.TOTAL += s.count;
    });

    return {
      items: items.map((i) => i.toPublicJSON()),
      total,
      page,
      limit,
      stats,
    };
  }

  async findLeaveRequestById(schoolId, id) {
    return LeaveRequest.findOne({ schoolId, _id: id });
  }

  async createLeaveRequest(schoolId, data) {
    return LeaveRequest.create({ ...data, schoolId });
  }

  async updateLeaveRequest(schoolId, id, data) {
    return LeaveRequest.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  async getEmployeeApprovedLeaveDays(schoolId, employeeRefId, year) {
    const sId = new mongoose.Types.ObjectId(schoolId);
    const eId = new mongoose.Types.ObjectId(employeeRefId);
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;

    const agg = await LeaveRequest.aggregate([
      {
        $match: {
          schoolId: sId,
          employeeRefId: eId,
          status: 'APPROVED',
          startDate: { $gte: startOfYear, $lte: endOfYear },
        },
      },
      {
        $group: {
          _id: '$leaveType',
          totalDays: { $sum: '$totalDays' },
        },
      },
    ]);

    const result = {
      CASUAL: 0,
      MEDICAL: 0,
      PAID: 0,
      UNPAID: 0,
      MATERNITY: 0,
      PATERNITY: 0,
      OTHER: 0,
      TOTAL: 0,
    };
    agg.forEach((a) => {
      result[a._id] = a.totalDays;
      result.TOTAL += a.totalDays;
    });
    return result;
  }

  // ==========================================
  // PERFORMANCE REVIEWS
  // ==========================================
  async listPerformanceReviews(schoolId, query = {}) {
    const filter = { schoolId };

    if (query.employeeRefId) filter.employeeRefId = query.employeeRefId;
    if (query.employeeType && query.employeeType !== 'ALL') filter.employeeType = query.employeeType.toUpperCase();
    if (query.department && query.department !== 'ALL') filter.department = query.department;
    if (query.reviewPeriod && query.reviewPeriod !== 'ALL') filter.reviewPeriod = query.reviewPeriod;
    if (query.status && query.status !== 'ALL') filter.status = query.status.toUpperCase();
    if (query.rating && query.rating !== 'ALL') filter.rating = Number(query.rating);
    if (query.search) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [
        { employeeName: regex },
        { employeeId: regex },
        { department: regex },
        { designation: regex },
      ];
    }

    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit });

    const [items, total, statsAgg] = await Promise.all([
      PerformanceReview.find(filter).sort({ reviewDate: -1 }).skip(skip).limit(limit),
      PerformanceReview.countDocuments(filter),
      PerformanceReview.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            total: { $sum: 1 },
            count5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            count4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            count3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            count2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            count1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          },
        },
      ]),
    ]);

    const statObj = statsAgg[0] || {
      avgRating: 0,
      total: 0,
      count5: 0,
      count4: 0,
      count3: 0,
      count2: 0,
      count1: 0,
    };

    return {
      items: items.map((i) => i.toPublicJSON()),
      total,
      page,
      limit,
      stats: {
        totalReviews: statObj.total,
        averageRating: Number((statObj.avgRating || 0).toFixed(1)),
        breakdown: {
          5: statObj.count5 || 0,
          4: statObj.count4 || 0,
          3: statObj.count3 || 0,
          2: statObj.count2 || 0,
          1: statObj.count1 || 0,
        },
      },
    };
  }

  async findPerformanceReviewById(schoolId, id) {
    return PerformanceReview.findOne({ schoolId, _id: id });
  }

  async createPerformanceReview(schoolId, data) {
    return PerformanceReview.create({ ...data, schoolId });
  }

  async updatePerformanceReview(schoolId, id, data) {
    return PerformanceReview.findOneAndUpdate({ schoolId, _id: id }, { $set: data }, { new: true });
  }

  async deletePerformanceReview(schoolId, id) {
    return PerformanceReview.findOneAndDelete({ schoolId, _id: id });
  }

  // ==========================================
  // EMPLOYEE DOCUMENTS
  // ==========================================
  async createDocument(schoolId, data) {
    return EmployeeDocument.create({ ...data, schoolId });
  }

  async listEmployeeDocuments(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.employeeRefId) filter.employeeRefId = query.employeeRefId;
    if (query.documentType && query.documentType !== 'ALL') {
      filter.documentType = query.documentType;
    }
    if (query.status && query.status !== 'ALL') {
      filter.verificationStatus = query.status.toUpperCase();
    }
    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [
        { employeeName: regex },
        { employeeId: regex },
        { department: regex },
        { documentName: regex },
        { documentType: regex },
      ];
    }

    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit });

    const [items, total] = await Promise.all([
      EmployeeDocument.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      EmployeeDocument.countDocuments(filter),
    ]);

    return {
      items: items.map((i) => i.toPublicJSON()),
      total,
      page,
      limit,
    };
  }

  async findDocumentById(schoolId, id) {
    return EmployeeDocument.findOne({ schoolId, _id: id });
  }

  async updateDocumentVerification(schoolId, id, status, verifiedBy = 'HR Admin') {
    return EmployeeDocument.findOneAndUpdate(
      { schoolId, _id: id },
      { $set: { verificationStatus: status.toUpperCase(), verifiedBy } },
      { new: true }
    );
  }

  async deleteDocument(schoolId, id) {
    return EmployeeDocument.findOneAndDelete({ schoolId, _id: id });
  }
}

export const hrRepository = new HRRepository();
