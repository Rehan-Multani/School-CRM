import mongoose from 'mongoose';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
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

// Invoices that still have money owed on them.
const OUTSTANDING_INVOICE_STATUSES = ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'];

export class SchoolReportsRepository {
  // Class, section and roll number live on the enrollment, not on the Student.
  // Returns studentId -> { className, sectionName, rollNumber }, preferring the
  // ACTIVE enrollment and falling back to the most recent one.
  async getEnrollmentMap(schoolId, studentIds = []) {
    const ids = [...new Set(studentIds.filter(Boolean).map(String))];
    if (!ids.length) return new Map();

    const enrollments = await StudentEnrollment.find({ schoolId, studentId: { $in: ids } })
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .sort({ enrollmentDate: -1, createdAt: -1 })
      .lean();

    const map = new Map();
    for (const e of enrollments) {
      const key = String(e.studentId);
      const current = map.get(key);
      if (current && (current.isActive || e.status !== 'ACTIVE')) continue;
      map.set(key, {
        className: e.classId?.name || '',
        sectionName: e.sectionId?.name || '',
        rollNumber: e.rollNumber || '',
        isActive: e.status === 'ACTIVE',
      });
    }
    return map;
  }

  async getSummary(schoolId) {
    const sId = new mongoose.Types.ObjectId(schoolId);

    const [
      studentsCount,
      schoolUsersCount,
      teachersCount,
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
      Teacher.countDocuments({ schoolId }),
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
      { $match: { schoolId: sId, status: { $in: OUTSTANDING_INVOICE_STATUSES } } },
      {
        $group: {
          _id: null,
          totalDue: { $sum: { $ifNull: ['$balanceAmount', '$totalAmount'] } },
        },
      },
    ]);

    return {
      studentsCount,
      // Staff are split across SchoolUser and Teacher, as in the HR module.
      staffCount: schoolUsersCount + teachersCount,
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
    if (query.search) {
      const safe = escapeRegex(query.search.trim());
      filter.$or = [
        { firstName: { $regex: safe, $options: 'i' } },
        { lastName: { $regex: safe, $options: 'i' } },
        { admissionNumber: { $regex: safe, $options: 'i' } },
        { parentName: { $regex: safe, $options: 'i' } },
        { parentPhone: { $regex: safe, $options: 'i' } },
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
        .select('admissionNumber firstName lastName gender phone parentName parentPhone status')
        .sort({ firstName: 1, lastName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(filter),
    ]);

    const enrollments = await this.getEnrollmentMap(schoolId, items.map((s) => s._id));
    return { items, total, page, limit, enrollments };
  }

  // 2. Fee Payments
  async getFeePaymentsReport(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.paymentMethod && query.paymentMethod !== 'ALL') filter.paymentMethod = query.paymentMethod;
    if (query.status && query.status !== 'ALL') filter.status = query.status;

    if (query.startDate || query.endDate) {
      filter.paymentDate = {};
      if (query.startDate) filter.paymentDate.$gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = end;
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
        .populate('studentId', 'firstName lastName admissionNumber')
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FeePayment.countDocuments(filter),
      // Same filter as the rows, so the total always matches what is listed.
      FeePayment.aggregate([
        { $match: { ...filter, schoolId: new mongoose.Types.ObjectId(schoolId) } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
      ]),
    ]);

    const enrollments = await this.getEnrollmentMap(schoolId, items.map((p) => p.studentId?._id));
    return {
      items,
      total,
      page,
      limit,
      enrollments,
      stats: { totalCollected: statsAgg[0]?.totalAmount || 0 },
    };
  }

  // 3. Fee Dues / Outstanding
  async getFeeDuesReport(schoolId, query = {}) {
    const filter = { schoolId, status: { $in: OUTSTANDING_INVOICE_STATUSES } };
    if (OUTSTANDING_INVOICE_STATUSES.includes(query.status)) filter.status = query.status;

    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      maxLimit: 500,
      defaultLimit: 100,
    });

    const [items, total, statsAgg] = await Promise.all([
      FeeInvoice.find(filter)
        .populate('studentId', 'firstName lastName admissionNumber parentPhone phone')
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      FeeInvoice.countDocuments(filter),
      FeeInvoice.aggregate([
        { $match: { ...filter, schoolId: new mongoose.Types.ObjectId(schoolId) } },
        {
          $group: {
            _id: null,
            totalDueAmount: { $sum: { $ifNull: ['$balanceAmount', '$totalAmount'] } },
            totalInvoicesCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const enrollments = await this.getEnrollmentMap(schoolId, items.map((inv) => inv.studentId?._id));
    return {
      items,
      total,
      page,
      limit,
      enrollments,
      stats: {
        totalDue: statsAgg[0]?.totalDueAmount || 0,
        defaultersCount: statsAgg[0]?.totalInvoicesCount || 0,
      },
    };
  }

  // 4. Staff Attendance
  // StaffAttendance holds one row per employee per day; the report is one row per day.
  async getStaffAttendanceReport(schoolId, query = {}) {
    const filter = { schoolId: new mongoose.Types.ObjectId(schoolId) };
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

    const countOf = (status) => ({ $sum: { $cond: [{ $eq: ['$status', status] }, 1, 0] } });
    const [items, days] = await Promise.all([
      StaffAttendance.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$date',
            marked: { $sum: 1 },
            present: countOf('PRESENT'),
            absent: countOf('ABSENT'),
            onLeave: countOf('LEAVE'),
            halfDay: countOf('HALF_DAY'),
            holiday: countOf('HOLIDAY'),
          },
        },
        { $sort: { _id: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      StaffAttendance.distinct('date', filter),
    ]);

    return { items, total: days.length, page, limit };
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
        { $match: { ...filter, schoolId: new mongoose.Types.ObjectId(schoolId) } },
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
    const paymentStatus = query.paymentStatus || query.status;
    if (paymentStatus && paymentStatus !== 'ALL') filter.paymentStatus = paymentStatus;
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
        { $match: { ...filter, schoolId: new mongoose.Types.ObjectId(schoolId) } },
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
        .populate('studentId', 'firstName lastName admissionNumber')
        .populate('hostelId', 'name type')
        .populate('roomId', 'roomNumber floorNumber')
        .populate('bedId', 'bedCode')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HostelAllocation.countDocuments(filter),
    ]);

    const enrollments = await this.getEnrollmentMap(schoolId, items.map((a) => a.studentId?._id));
    return { items, total, page, limit, enrollments };
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
        .populate('studentId', 'firstName lastName admissionNumber')
        .populate('routeId', 'routeName')
        .populate('stopId', 'stopName pickupTime dropTime')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StudentTransportAssignment.countDocuments(filter),
    ]);

    const enrollments = await this.getEnrollmentMap(schoolId, items.map((a) => a.studentId?._id));
    return { items, total, page, limit, enrollments };
  }

  // 9. Library
  async getLibraryReport(schoolId, query = {}) {
    const filter = { schoolId };
    // `query.category` is the report category ("library"), so the book
    // category filter has its own name.
    if (query.bookCategory && query.bookCategory !== 'ALL') filter.category = query.bookCategory;
    if (query.search) {
      const safe = escapeRegex(query.search.trim());
      filter.$or = [
        { title: { $regex: safe, $options: 'i' } },
        { author: { $regex: safe, $options: 'i' } },
        { bookCode: { $regex: safe, $options: 'i' } },
      ];
    }

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
        { $match: { ...filter, schoolId: new mongoose.Types.ObjectId(schoolId) } },
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

    if (query.search) {
      const safe = escapeRegex(query.search.trim());
      filter.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
        { employeeId: { $regex: safe, $options: 'i' } },
      ];
    }

    // Staff are split across two collections (as in the HR module), so the
    // merged list is sorted and paged in memory — a school's staff is small.
    const fields = 'employeeId name email phone designation department status';
    const { role, ...teacherFilter } = filter;
    const [users, teachers] = await Promise.all([
      SchoolUser.find(filter).select(`${fields} role`).lean(),
      !role || role === 'TEACHER' ? Teacher.find(teacherFilter).select(fields).lean() : [],
    ]);

    const all = [...users, ...teachers.map((t) => ({ ...t, role: 'TEACHER' }))].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''))
    );

    return { items: all.slice(skip, skip + limit), total: all.length, page, limit };
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
    // On a ticket `schoolId` is the school's code; the School _id is in `school`.
    const filter = { school: schoolId };
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
