import mongoose from 'mongoose';
import { School } from '../models/School.js';
import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { StaffAttendance } from '../models/StaffAttendance.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { FeePayment } from '../models/FeePayment.js';
import { LibraryBook } from '../models/LibraryBook.js';
import { LibraryIssue } from '../models/LibraryIssue.js';
import { Hostel } from '../models/Hostel.js';
import { HostelBed } from '../models/HostelBed.js';
import { HostelAllocation } from '../models/HostelAllocation.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { StudentTransportAssignment } from '../models/StudentTransportAssignment.js';
import { Exam } from '../models/Exam.js';
import { ExamResult } from '../models/ExamResult.js';

export const schoolDashboardService = {
  async getDashboardSummary(schoolId) {
    if (!schoolId) throw new Error('School ID is required');

    let targetId = schoolId;
    let stringId = String(schoolId);
    if (mongoose.isValidObjectId(schoolId)) {
      const schoolDoc = await School.findById(schoolId).lean();
      if (schoolDoc) {
        targetId = schoolDoc._id;
        stringId = schoolDoc.schoolId || schoolDoc.code || String(schoolDoc._id);
      }
    } else {
      const schoolDoc = await School.findOne({ $or: [{ schoolId }, { code: schoolId }] }).lean();
      if (schoolDoc) {
        targetId = schoolDoc._id;
        stringId = schoolDoc.schoolId || schoolDoc.code || String(schoolDoc._id);
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const targetObjId = mongoose.isValidObjectId(targetId) ? targetId : new mongoose.Types.ObjectId();
    const schoolQuery = { schoolId: targetObjId };

    // 1. Core Counts
    const [
      totalStudents,
      totalTeachers,
      totalStaff,
      totalClasses,
      totalSections,
      libraryBooksCount,
      activeIssuedBooks,
      totalHostelBeds,
      occupiedHostelBeds,
      totalVehicles,
      activeTransportStudents,
      totalExams,
    ] = await Promise.all([
      Student.countDocuments({ ...schoolQuery, status: 'ACTIVE' }),
      Teacher.countDocuments({ ...schoolQuery, status: 'ACTIVE' }),
      SchoolUser.countDocuments({ ...schoolQuery, status: 'ACTIVE' }),
      SchoolClass.countDocuments({ ...schoolQuery, status: 'ACTIVE' }),
      Section.countDocuments({ ...schoolQuery, status: 'ACTIVE' }),
      LibraryBook.countDocuments(schoolQuery),
      LibraryIssue.countDocuments({ ...schoolQuery, status: 'ISSUED' }),
      HostelBed.countDocuments(schoolQuery),
      HostelBed.countDocuments({ ...schoolQuery, status: 'OCCUPIED' }),
      Vehicle.countDocuments({ ...schoolQuery, status: 'ACTIVE' }),
      StudentTransportAssignment.countDocuments({ ...schoolQuery, status: 'ACTIVE' }),
      Exam.countDocuments({ ...schoolQuery, status: { $in: ['ACTIVE', 'SCHEDULED', 'IN_PROGRESS'] } }),
    ]);

    // 2. Attendance Metrics (Staff Attendance from DB)
    const todayStaffAttendance = await StaffAttendance.findOne({ ...schoolQuery, date: todayStr }).lean();
    let staffPresentCount = 0;
    let staffTotalCount = totalTeachers + totalStaff;
    if (todayStaffAttendance?.records?.length) {
      staffPresentCount = todayStaffAttendance.records.filter((r) => r.status === 'PRESENT').length;
      staffTotalCount = todayStaffAttendance.records.length;
    }
    const staffAttendanceRate = staffTotalCount > 0 ? Math.round((staffPresentCount / staffTotalCount) * 100) : 0;

    // 3. Financial Metrics (Fee collection today & month, pending invoices)
    const [todayPayments, monthPayments, feeInvoices] = await Promise.all([
      FeePayment.find({ ...schoolQuery, createdAt: { $gte: startOfToday } }).lean(),
      FeePayment.find({ ...schoolQuery, createdAt: { $gte: startOfMonth } }).lean(),
      FeeInvoice.find({ ...schoolQuery, status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }).select('balanceAmount totalAmount paidAmount').lean(),
    ]);

    const collectedToday = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const collectedMonth = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const pendingFees = feeInvoices.reduce((sum, inv) => sum + (inv.balanceAmount || inv.totalAmount || 0), 0);

    // 4. Gender Ratio & Distribution (Real data only)
    const [maleStudents, femaleStudents] = await Promise.all([
      Student.countDocuments({ ...schoolQuery, gender: { $regex: /^m/i } }),
      Student.countDocuments({ ...schoolQuery, gender: { $regex: /^f/i } }),
    ]);

    const genderDistribution = (totalStudents > 0) ? [
      { name: 'Male', count: maleStudents },
      { name: 'Female', count: femaleStudents },
    ] : [];

    // 5. Class-wise student strength (Real DB data only)
    const classes = await SchoolClass.find({ ...schoolQuery, status: 'ACTIVE' }).sort({ numericOrder: 1, name: 1 }).limit(8).lean();
    const classStrength = await Promise.all(
      classes.map(async (c) => {
        const count = await Student.countDocuments({ ...schoolQuery, classId: c._id, status: 'ACTIVE' });
        return {
          class: c.name || `Class ${c.grade}`,
          strength: count,
        };
      })
    );

    // 6. Admissions Trend (Real monthly grouping from Student collection)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = now.getMonth();
    const admissionsTrend = [];
    for (let i = 6; i >= 0; i--) {
      const targetMonthDate = new Date(now.getFullYear(), currentMonthIdx - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), currentMonthIdx - i + 1, 1);
      const mName = months[(currentMonthIdx - i + 12) % 12];
      
      const count = await Student.countDocuments({
        ...schoolQuery,
        createdAt: { $gte: targetMonthDate, $lt: nextMonthDate },
      });

      admissionsTrend.push({
        month: mName,
        admissions: count,
      });
    }

    // 7. Recent Activities Feed (from real records)
    const [recentStudents, recentPayments, recentIssues, recentAllocations] = await Promise.all([
      Student.find({ schoolId }).sort({ createdAt: -1 }).limit(3).lean(),
      FeePayment.find({ schoolId }).sort({ createdAt: -1 }).limit(3).populate('studentId', 'firstName lastName').lean(),
      LibraryIssue.find({ schoolId }).sort({ createdAt: -1 }).limit(2).populate('bookId', 'title').populate('studentId', 'firstName lastName').lean(),
      HostelAllocation.find({ schoolId }).sort({ createdAt: -1 }).limit(2).populate('studentId', 'firstName lastName').populate('roomId', 'roomNumber').lean(),
    ]);

    const recentActivities = [];

    recentStudents.forEach((s) => {
      recentActivities.push({
        id: `stu-${s._id}`,
        text: `New student ${s.firstName || ''} ${s.lastName || ''}`.trim() + ` admitted to ${s.className || 'School'}`,
        time: s.createdAt ? new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        category: 'Admission',
        color: 'emerald',
      });
    });

    recentPayments.forEach((p) => {
      recentActivities.push({
        id: `pay-${p._id}`,
        text: `Fee payment of ₹${(p.amount || 0).toLocaleString()} received (Receipt #${p.receiptNumber || 'REC-01'})`,
        time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
        category: 'Finance',
        color: 'amber',
      });
    });

    recentIssues.forEach((iss) => {
      recentActivities.push({
        id: `lib-${iss._id}`,
        text: `Library book "${iss.bookId?.title || 'Book'}" issued to student`,
        time: 'Recently',
        category: 'Library',
        color: 'indigo',
      });
    });

    recentAllocations.forEach((h) => {
      recentActivities.push({
        id: `hos-${h._id}`,
        text: `Hostel room ${h.roomId?.roomNumber || 'Room'} allocated to ${h.studentId?.firstName || 'Student'}`,
        time: 'Recently',
        category: 'Hostel',
        color: 'purple',
      });
    });

    return {
      kpi: {
        totalStudents,
        totalTeachers,
        totalEmployees: totalTeachers + totalStaff,
        attendanceRate: staffAttendanceRate,
        collectedToday,
        collectedMonth,
        pendingFees,
        classesCount: `${totalClasses} / ${totalSections}`,
        libraryBooks: libraryBooksCount,
        issuedBooks: activeIssuedBooks,
        hostelBeds: totalHostelBeds,
        hostelOccupied: occupiedHostelBeds,
        hostelOccupancyRate: totalHostelBeds > 0 ? Math.round((occupiedHostelBeds / totalHostelBeds) * 100) : 0,
        fleetVehicles: totalVehicles,
        transportStudents: activeTransportStudents,
        upcomingExams: totalExams,
      },
      charts: {
        admissionsTrend: admissionsTrend.some((a) => a.admissions > 0) ? admissionsTrend : [],
        classStrength: classStrength.some((c) => c.strength > 0) ? classStrength : [],
        genderDistribution,
        weeklyAttendance: [],
        monthlyFeeTrend: [],
        examPerformance: [],
      },
      recentActivities: recentActivities.slice(0, 6),
    };
  },
};
