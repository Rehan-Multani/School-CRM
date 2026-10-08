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

    const now = new Date();
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = ymd(now);
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      weekDays.push({ date: ymd(d), day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] });
    }
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
      FeePayment.aggregate([
        { $match: { status: 'COMPLETED', ...match } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$amount', 0] } } } },
      ]);

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
      weekAttAgg,
      feeTrendAgg,
      examPerfAgg,
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
      StaffAttendance.aggregate([
        { $match: { ...schoolQuery, date: todayStr, status: { $ne: 'HOLIDAY' } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: {
              $sum: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$status', 'PRESENT'] }, then: 1 },
                    { case: { $eq: ['$status', 'HALF_DAY'] }, then: 0.5 },
                  ],
                  default: 0,
                },
              },
            },
          },
        },
      ]).catch(() => []),
      // Fee collection today & this month, and what is still owed — summed in the database
      sumAmount({ ...schoolQuery, paymentDate: { $gte: startOfToday } }),
      sumAmount({ ...schoolQuery, paymentDate: { $gte: startOfMonth } }),
      FeeInvoice.aggregate([
        { $match: { ...schoolQuery, status: { $in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] } } },
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
      // Weekly student attendance (last 7 days, % present per day)
      StudentAttendance.aggregate([
        { $match: { schoolId: targetObjId, date: { $in: weekDays.map((d) => d.date) } } },
        { $unwind: '$entries' },
        {
          $group: {
            _id: '$date',
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $in: ['$entries.status', ['PRESENT', 'LATE', 'HALF_DAY']] }, 1, 0] } },
          },
        },
      ]).catch(() => []),
      // Monthly fee collection (last 7 months, completed payments by payment date)
      FeePayment.aggregate([
        { $match: { ...schoolQuery, status: 'COMPLETED', paymentDate: { $gte: trendMonths[0].from } } },
        {
          $group: {
            _id: { y: { $year: { date: '$paymentDate', timezone: process.env.TZ || 'Asia/Kolkata' } }, m: { $month: { date: '$paymentDate', timezone: process.env.TZ || 'Asia/Kolkata' } } },
            collected: { $sum: '$amount' },
          },
        },
      ]).catch(() => []),
      // Exam performance: average % of the 6 most recent exams with results
      ExamResult.aggregate([
        { $match: { schoolId: targetObjId } },
        { $group: { _id: '$examId', average: { $avg: '$percentage' }, students: { $sum: 1 }, last: { $max: '$updatedAt' } } },
        { $sort: { last: -1 } },
        { $limit: 6 },
        { $lookup: { from: 'exams', localField: '_id', foreignField: '_id', as: 'exam' } },
        { $unwind: { path: '$exam', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, name: { $ifNull: ['$exam.name', 'Exam'] }, average: { $round: ['$average', 1] }, students: 1, last: 1 } },
        { $sort: { last: 1 } },
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

    const staffAgg = Array.isArray(todayStaffAttendance) ? todayStaffAttendance[0] : null;
    const staffPresentCount = staffAgg?.present || 0;
    const staffTotalCount = staffAgg?.total || 0;
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

    const weekMap = new Map((weekAttAgg || []).map((r) => [r._id, r]));
    const weeklyAttendance = weekDays.map((d) => {
      const r = weekMap.get(d.date);
      return { day: d.day, date: d.date, attendance: r && r.total > 0 ? Math.round((r.present / r.total) * 100) : 0, marked: Boolean(r) };
    });
    const feeMap = new Map((feeTrendAgg || []).map((r) => [`${r._id.y}-${r._id.m}`, r.collected]));
    const monthlyFeeTrend = trendMonths.map((m) => ({
      month: m.name,
      collected: Math.round((feeMap.get(`${m.from.getFullYear()}-${m.from.getMonth() + 1}`) || 0) * 100) / 100,
    }));

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
        weeklyAttendance: weeklyAttendance.some((d) => d.marked) ? weeklyAttendance : [],
        monthlyFeeTrend: monthlyFeeTrend.some((m) => m.collected > 0) ? monthlyFeeTrend : [],
        examPerformance: examPerfAgg || [],
      },
      recentActivities: recentActivities.slice(0, 6),
      upcomingEvents,
    };
  },
};
