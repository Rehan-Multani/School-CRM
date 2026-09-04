import mongoose from 'mongoose';
import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { FeePayment } from '../models/FeePayment.js';
import { StaffAttendance } from '../models/StaffAttendance.js';
import { PerformanceReview } from '../models/PerformanceReview.js';
import { Payroll } from '../models/Payroll.js';
import { HostelAllocation } from '../models/HostelAllocation.js';
import { StudentTransportAssignment } from '../models/StudentTransportAssignment.js';
import { LibraryBook } from '../models/LibraryBook.js';
import { LibraryIssue } from '../models/LibraryIssue.js';
import { Exam } from '../models/Exam.js';
import { ExamResult } from '../models/ExamResult.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { Homework } from '../models/Homework.js';
import { escapeRegex, sanitizePagination } from '../../../shared/sanitize.js';

export class SchoolReportsRepository {
  async getSummary(schoolId) {
    const sId = new mongoose.Types.ObjectId(schoolId);

    const [
      studentsCount,
      staffCount,
      feeInvoicesCount,
      libraryCount,
      hostelCount,
      transportCount,
      examsCount,
      reviewsCount,
      payrollCount,
    ] = await Promise.all([
      Student.countDocuments({ schoolId }),
      SchoolUser.countDocuments({ schoolId }),
      FeeInvoice.countDocuments({ schoolId }),
      LibraryBook.countDocuments({ schoolId }),
      HostelAllocation.countDocuments({ schoolId, status: 'ACTIVE' }),
      StudentTransportAssignment.countDocuments({ schoolId, status: 'ACTIVE' }),
      Exam.countDocuments({ schoolId }),
      PerformanceReview.countDocuments({ schoolId }),
      Payroll.countDocuments({ schoolId }),
    ]);

    // Financial aggregation
    const feeAgg = await FeePayment.aggregate([
      { $match: { schoolId: sId } },
      { $group: { _id: null, totalCollected: { $sum: '$amount' } } },
    ]);

    const duesAgg = await FeeInvoice.aggregate([
      { $match: { schoolId: sId, status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
      {
        $group: {
          _id: null,
          totalDue: { $sum: { $ifNull: ['$balanceAmount', '$totalAmount'] } },
        },
      },
    ]);

    return {
      studentsCount,
      staffCount,
      feeInvoicesCount,
      libraryCount,
      hostelCount,
      transportCount,
      examsCount,
      reviewsCount,
      payrollCount,
      totalCollected: feeAgg[0]?.totalCollected || 0,
      totalDue: duesAgg[0]?.totalDue || 0,
    };
  }

  // 1. Students
  async getStudentsReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.className && query.className !== 'ALL') filter.className = query.className;
    if (query.search) {
      const safe = escapeRegex(query.search.trim());
      filter.$or = [
        { firstName: { $regex: safe, $options: 'i' } },
        { lastName: { $regex: safe, $options: 'i' } },
        { admissionNumber: { $regex: safe, $options: 'i' } },
        { rollNumber: { $regex: safe, $options: 'i' } },
        { guardianName: { $regex: safe, $options: 'i' } },
      ];
    }

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total] = await Promise.all([
      Student.find(filter)
        .select('admissionNumber firstName lastName className sectionName gender rollNumber phone guardianName guardianPhone status dateOfBirth bloodGroup')
        .sort({ className: 1, rollNumber: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // 2. Fee Payments
  async getFeePaymentsReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.paymentMethod && query.paymentMethod !== 'ALL') filter.paymentMethod = query.paymentMethod;
    if (query.status && query.status !== 'ALL') filter.status = query.status;

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) filter.createdAt.$gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total, statsAgg] = await Promise.all([
      FeePayment.find(filter)
        .populate('studentId', 'firstName lastName admissionNumber className sectionName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FeePayment.countDocuments(filter),
      FeePayment.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
      ]),
    ]);

    return {
      items,
      total,
      page,
      limit,
      stats: { totalCollected: statsAgg[0]?.totalAmount || 0 },
    };
  }

  // 3. Fee Dues / Outstanding
  async getFeeDuesReport(schoolId, query = {}) {
    const filter = { schoolId, status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } };
    if (query.status && query.status !== 'ALL') filter.status = query.status;

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total, statsAgg] = await Promise.all([
      FeeInvoice.find(filter)
        .populate('studentId', 'firstName lastName admissionNumber className sectionName parentPhone phone')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FeeInvoice.countDocuments(filter),
      FeeInvoice.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
        {
          $group: {
            _id: null,
            totalDueAmount: { $sum: { $ifNull: ['$balanceAmount', '$totalAmount'] } },
            totalInvoicesCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      items,
      total,
      page,
      limit,
      stats: {
        totalDue: statsAgg[0]?.totalDueAmount || 0,
        defaultersCount: statsAgg[0]?.totalInvoicesCount || 0,
      },
    };
  }

  // 4. Staff Attendance
  async getStaffAttendanceReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) filter.date.$gte = query.startDate;
      if (query.endDate) filter.date.$lte = query.endDate;
    }

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 100,
      defaultLimit: 50,
    });

    const [items, total] = await Promise.all([
      StaffAttendance.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      StaffAttendance.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // 5. Performance Reviews
  async getPerformanceReviewsReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.rating && query.rating !== 'ALL') filter.rating = Number(query.rating);
    if (query.status && query.status !== 'ALL') filter.status = query.status.toUpperCase();
    if (query.reviewPeriod && query.reviewPeriod !== 'ALL') filter.reviewPeriod = query.reviewPeriod;
    if (query.department && query.department !== 'ALL') filter.department = query.department;
    if (query.search) {
      const safe = escapeRegex(query.search.trim());
      filter.$or = [
        { employeeName: { $regex: safe, $options: 'i' } },
        { employeeId: { $regex: safe, $options: 'i' } },
        { designation: { $regex: safe, $options: 'i' } },
      ];
    }

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total, statsAgg] = await Promise.all([
      PerformanceReview.find(filter).sort({ reviewDate: -1 }).skip(skip).limit(limit).lean(),
      PerformanceReview.countDocuments(filter),
      PerformanceReview.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      items,
      total,
      page,
      limit,
      stats: {
        averageRating: statsAgg[0]?.avgRating ? Number(statsAgg[0].avgRating.toFixed(1)) : 0,
        totalReviews: statsAgg[0]?.totalReviews || 0,
      },
    };
  }

  // 6. Payroll
  async getPayrollReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.payrollMonth && query.payrollMonth !== 'ALL') filter.payrollMonth = query.payrollMonth;
    if (query.paymentStatus && query.paymentStatus !== 'ALL') filter.paymentStatus = query.paymentStatus;
    if (query.department && query.department !== 'ALL') filter.department = query.department;

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total, statsAgg] = await Promise.all([
      Payroll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Payroll.countDocuments(filter),
      Payroll.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
        {
          $group: {
            _id: null,
            totalDisbursed: { $sum: '$netSalary' },
            totalGross: { $sum: '$grossEarnings' },
            totalDeductions: { $sum: '$totalDeductions' },
          },
        },
      ]),
    ]);

    return {
      items,
      total,
      page,
      limit,
      stats: {
        totalNetDisbursed: statsAgg[0]?.totalDisbursed || 0,
        totalGross: statsAgg[0]?.totalGross || 0,
        totalDeductions: statsAgg[0]?.totalDeductions || 0,
      },
    };
  }

  // 7. Hostel
  async getHostelReport(schoolId, query = {}) {
    const filter = { schoolId, status: query.status && query.status !== 'ALL' ? query.status : 'ACTIVE' };

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total] = await Promise.all([
      HostelAllocation.find(filter)
        .populate('studentId', 'firstName lastName rollNumber className sectionName')
        .populate('hostelId', 'name type')
        .populate('roomId', 'roomNumber blockName')
        .populate('bedId', 'bedCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HostelAllocation.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // 8. Transport
  async getTransportReport(schoolId, query = {}) {
    const filter = { schoolId, status: query.status && query.status !== 'ALL' ? query.status : 'ACTIVE' };

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total] = await Promise.all([
      StudentTransportAssignment.find(filter)
        .populate('studentId', 'firstName lastName rollNumber className sectionName')
        .populate('routeId', 'routeName routeCode')
        .populate('pickupStopId', 'stopName pickupTime')
        .populate('dropStopId', 'stopName dropTime')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StudentTransportAssignment.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // 9. Library
  async getLibraryReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.category && query.category !== 'ALL') filter.category = query.category;

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total, statsAgg] = await Promise.all([
      LibraryBook.find(filter).sort({ title: 1 }).skip(skip).limit(limit).lean(),
      LibraryBook.countDocuments(filter),
      LibraryBook.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
        {
          $group: {
            _id: null,
            totalCopies: { $sum: '$totalCopies' },
            availableCopies: { $sum: '$availableCopies' },
          },
        },
      ]),
    ]);

    return {
      items,
      total,
      page,
      limit,
      stats: {
        totalBooks: total,
        totalCopies: statsAgg[0]?.totalCopies || 0,
        availableCopies: statsAgg[0]?.availableCopies || 0,
        issuedCopies: Math.max(0, (statsAgg[0]?.totalCopies || 0) - (statsAgg[0]?.availableCopies || 0)),
      },
    };
  }

  // 10. Staff Directory
  async getStaffDirectoryReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.role && query.role !== 'ALL') filter.role = query.role;
    if (query.department && query.department !== 'ALL') filter.department = query.department;

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total] = await Promise.all([
      SchoolUser.find(filter)
        .select('fullName email phone designation department role status createdAt')
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SchoolUser.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // 11. Examinations & Results
  async getExamsReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status && query.status !== 'ALL') filter.status = query.status;

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 200,
      defaultLimit: 50,
    });

    const [items, total] = await Promise.all([
      Exam.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit).lean(),
      Exam.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // 13. Homework
  async getHomeworkReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status && query.status !== 'ALL') filter.status = String(query.status).toUpperCase();
    if (query.classId) filter.classId = query.classId;

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 200,
      defaultLimit: 50,
    });

    const [items, total] = await Promise.all([
      Homework.find(filter).sort({ assignedDate: -1 }).skip(skip).limit(limit).lean(),
      Homework.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  // 12. Support Tickets
  async getSupportReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.priority && query.priority !== 'ALL') filter.priority = query.priority;

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 200,
      defaultLimit: 50,
    });

    const [items, total] = await Promise.all([
      SupportTicket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      SupportTicket.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }
}

export const schoolReportsRepository = new SchoolReportsRepository();
