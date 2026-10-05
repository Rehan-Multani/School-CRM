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
import { Event } from '../models/Event.js';
import { Homework } from '../models/Homework.js';
import { StudentAttendance } from '../models/StudentAttendance.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';

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

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = now.getMonth();
    const trendMonths = [];
    for (let i = 6; i >= 0; i--) {
      trendMonths.push({
        name: months[(currentMonthIdx - i + 12) % 12],
        from: new Date(now.getFullYear(), currentMonthIdx - i, 1),
        to: new Date(now.getFullYear(), currentMonthIdx - i + 1, 1),
      });
    }
    const sumAmount = (match) =>
      FeePayment.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } }]);

    // Every figure below is independent of the others, so they are fetched in
    // one parallel wave — the page waits for the slowest query, not their sum.
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
      todayStaffAttendance,
      todayPaid,
      monthPaid,
      pendingAgg,
      maleStudents,
      femaleStudents,
      classes,
      strengthAgg,
      trendCounts,
      recentStudents,
      recentPayments,
      recentIssues,
      recentAllocations,
      evRows,
      hwAgg,
      saAgg,
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
      // Staff attendance today
      StaffAttendance.findOne({ ...schoolQuery, date: todayStr }).lean(),
      // Fee collection today & this month, and what is still owed — summed in the database
      sumAmount({ ...schoolQuery, createdAt: { $gte: startOfToday } }),
      sumAmount({ ...schoolQuery, createdAt: { $gte: startOfMonth } }),
      FeeInvoice.aggregate([
        { $match: { ...schoolQuery, status: { $in: ['PENDING', 'PARTIAL', 'OVERDUE'] } } },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $cond: [
                  { $ne: [{ $ifNull: ['$balanceAmount', 0] }, 0] },
                  '$balanceAmount',
                  { $ifNull: ['$totalAmount', 0] },
                ],
              },
            },
          },
        },
      ]),
      // Gender ratio
      Student.countDocuments({ ...schoolQuery, gender: { $regex: /^m/i } }),
      Student.countDocuments({ ...schoolQuery, gender: { $regex: /^f/i } }),
      // Class-wise strength: the first 8 classes, with one grouped count for all of them
      SchoolClass.find({ ...schoolQuery, status: 'ACTIVE' }).sort({ numericOrder: 1, name: 1 }).limit(8).lean(),
      // (a student's class lives on the enrollment, not on the Student record)
      StudentEnrollment.aggregate([{ $match: { ...schoolQuery, status: 'ACTIVE' } }, { $group: { _id: '$classId', count: { $sum: 1 } } }]),
      // Admissions trend (last 7 months)
      Promise.all(
        trendMonths.map((m) => Student.countDocuments({ ...schoolQuery, createdAt: { $gte: m.from, $lt: m.to } }))
      ),
      // Recent activity feed
      Student.find({ schoolId }).sort({ createdAt: -1 }).limit(3).lean(),
      FeePayment.find({ schoolId }).sort({ createdAt: -1 }).limit(3).lean(),
      LibraryIssue.find({ schoolId }).sort({ createdAt: -1 }).limit(2).populate('bookId', 'title').lean(),
      HostelAllocation.find({ schoolId }).sort({ createdAt: -1 }).limit(2).populate('studentId', 'firstName lastName').populate('roomId', 'roomNumber').lean(),
      // Upcoming events (next 5, not cancelled)
      Event.find({ schoolId: targetObjId, manualStatus: '', startAt: { $gte: startOfToday } })
        .sort({ startAt: 1 })
        .limit(5)
        .lean()
        .catch(() => []),
      // Homework KPIs
      Homework.aggregate([
        { $match: { schoolId: targetObjId } },
        {
          $group: {
            _id: null,
            active: { $sum: { $cond: [{ $eq: ['$status', 'ASSIGNED'] }, 1, 0] } },
            totalStudents: { $sum: '$totalStudents' },
            submitted: { $sum: '$submittedCount' },
          },
        },
      ]).catch(() => []),
      // Student attendance rate (today)
      StudentAttendance.aggregate([
        { $match: { schoolId: targetObjId, date: todayStr } },
        { $unwind: '$entries' },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: {
              $sum: {
                $cond: [{ $in: ['$entries.status', ['PRESENT', 'LATE', 'HALF_DAY']] }, 1, 0],
              },
            },
          },
        },
      ]).catch(() => []),
    ]);

    let staffPresentCount = 0;
    let staffTotalCount = totalTeachers + totalStaff;
    if (todayStaffAttendance?.records?.length) {
      staffPresentCount = todayStaffAttendance.records.filter((r) => r.status === 'PRESENT').length;
      staffTotalCount = todayStaffAttendance.records.length;
    }
    const staffAttendanceRate = staffTotalCount > 0 ? Math.round((staffPresentCount / staffTotalCount) * 100) : 0;

    const collectedToday = todayPaid[0]?.total || 0;
    const collectedMonth = monthPaid[0]?.total || 0;
    const pendingFees = pendingAgg[0]?.total || 0;

    const genderDistribution = (totalStudents > 0) ? [
      { name: 'Male', count: maleStudents },
      { name: 'Female', count: femaleStudents },
    ] : [];

    const strengthByClass = new Map(strengthAgg.map((row) => [String(row._id), row.count]));
    const classStrength = classes.map((c) => ({
      class: c.name || `Class ${c.grade}`,
      strength: strengthByClass.get(String(c._id)) || 0,
    }));

    const admissionsTrend = trendMonths.map((m, i) => ({ month: m.name, admissions: trendCounts[i] }));

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
        text: `Library book "${iss.bookId?.title || 'Book'}" issued to ${iss.borrowerName || 'a borrower'}`,
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

    const upcomingEvents = evRows.map((e) => ({
      id: String(e._id),
      title: e.title,
      category: e.category,
      startAt: e.startAt,
      endAt: e.endAt,
      venue: e.venue || '',
    }));

    const h = hwAgg[0];
    const activeHomework = h ? h.active : 0;
    const homeworkSubmissionRate = h && h.totalStudents > 0 ? Math.round((h.submitted / h.totalStudents) * 100) : 0;

    const sa = saAgg[0];
    const studentAttendanceRate = sa && sa.total > 0 ? Math.round((sa.present / sa.total) * 100) : 0;

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
        activeHomework,
        homeworkSubmissionRate,
        studentAttendanceRate,
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
      upcomingEvents,
    };
  },
};
