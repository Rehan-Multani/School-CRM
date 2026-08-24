import mongoose from 'mongoose';
import { StaffAttendance } from '../models/StaffAttendance.js';
import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';

class StaffAttendanceRepository {
  async getDailyAttendance(schoolId, date, query = {}) {
    const [teachers, staff, recordedAttendance] = await Promise.all([
      Teacher.find({ schoolId, status: 'ACTIVE' })
        .select('_id employeeId personalDetails employmentDetails')
        .lean(),
      SchoolUser.find({ schoolId, status: 'ACTIVE' })
        .select('_id employeeId name firstName lastName email role department designation photo')
        .lean(),
      StaffAttendance.find({ schoolId, date }).lean(),
    ]);

    const recordedMap = new Map();
    recordedAttendance.forEach((rec) => {
      recordedMap.set(rec.employeeRefId.toString(), rec);
    });

    const formattedTeachers = teachers.map((t) => {
      const id = t._id.toString();
      const rec = recordedMap.get(id);
      const name = `${t.personalDetails?.firstName || ''} ${t.personalDetails?.lastName || ''}`.trim() || 'Teacher';
      const employeeId = t.employeeId || `TCH-${id.slice(-4).toUpperCase()}`;

      return {
        id: rec?._id ? rec._id.toString() : `temp-tch-${id}`,
        employeeRefId: id,
        employeeType: 'TEACHER',
        employeeId,
        employeeName: name,
        employeeRole: 'TEACHER',
        department: t.employmentDetails?.department || 'Academic',
        date,
        status: rec?.status || 'PRESENT',
        leaveType: rec?.leaveType || '',
        leaveReason: rec?.leaveReason || '',
        clockIn: rec?.clockIn || '08:00 AM',
        clockOut: rec?.clockOut || '03:00 PM',
        remarks: rec?.remarks || '',
        isSaved: Boolean(rec),
      };
    });

    const formattedStaff = staff.map((s) => {
      const id = s._id.toString();
      const rec = recordedMap.get(id);
      const name = s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff';
      const employeeId = s.employeeId || `EMP-${id.slice(-4).toUpperCase()}`;

      return {
        id: rec?._id ? rec._id.toString() : `temp-stf-${id}`,
        employeeRefId: id,
        employeeType: 'STAFF',
        employeeId,
        employeeName: name,
        employeeRole: s.role,
        department: s.department || s.role,
        date,
        status: rec?.status || 'PRESENT',
        leaveType: rec?.leaveType || '',
        leaveReason: rec?.leaveReason || '',
        clockIn: rec?.clockIn || '08:30 AM',
        clockOut: rec?.clockOut || '04:30 PM',
        remarks: rec?.remarks || '',
        isSaved: Boolean(rec),
      };
    });

    let allEmployees = [...formattedTeachers, ...formattedStaff].sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName)
    );

    // Compute Overall Stats before query filters
    const stats = {
      totalCount: allEmployees.length,
      presentCount: allEmployees.filter((e) => e.status === 'PRESENT').length,
      absentCount: allEmployees.filter((e) => e.status === 'ABSENT').length,
      leaveCount: allEmployees.filter((e) => e.status === 'LEAVE').length,
      halfDayCount: allEmployees.filter((e) => e.status === 'HALF_DAY').length,
    };

    // Filter by Role
    if (query.role && query.role !== 'ALL') {
      allEmployees = allEmployees.filter((e) => e.employeeRole === query.role.toUpperCase());
    }

    // Filter by Status
    if (query.status && query.status !== 'ALL') {
      allEmployees = allEmployees.filter((e) => e.status === query.status.toUpperCase());
    }

    // Filter by Search
    if (query.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      allEmployees = allEmployees.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(term) ||
          e.employeeId.toLowerCase().includes(term) ||
          e.department.toLowerCase().includes(term) ||
          e.employeeRole.toLowerCase().includes(term)
      );
    }

    return {
      date,
      items: allEmployees,
      stats,
    };
  }

  async saveDailyAttendance(schoolId, date, records = []) {
    if (!records || records.length === 0) return { modifiedCount: 0 };

    const operations = records.map((rec) => ({
      updateOne: {
        filter: {
          schoolId,
          date,
          employeeRefId: rec.employeeRefId,
        },
        update: {
          $set: {
            schoolId,
            employeeRefId: rec.employeeRefId,
            employeeType: rec.employeeType || 'STAFF',
            employeeId: rec.employeeId,
            employeeName: rec.employeeName,
            employeeRole: rec.employeeRole,
            department: rec.department || '',
            date,
            status: rec.status || 'PRESENT',
            leaveType: rec.status === 'LEAVE' ? rec.leaveType || 'CASUAL' : '',
            leaveReason: rec.status === 'LEAVE' ? rec.leaveReason || '' : '',
            clockIn: rec.clockIn || '08:00 AM',
            clockOut: rec.clockOut || '03:00 PM',
            remarks: rec.remarks || '',
          },
        },
        upsert: true,
      },
    }));

    return StaffAttendance.bulkWrite(operations);
  }

  async updateSingleStatus(schoolId, date, employeeRefId, data) {
    const filter = { schoolId, date, employeeRefId };
    const update = {
      $set: {
        schoolId,
        date,
        employeeRefId,
        ...data,
      },
    };
    return StaffAttendance.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  async markAllStatus(schoolId, date, status = 'PRESENT') {
    const [teachers, staff] = await Promise.all([
      Teacher.find({ schoolId, status: 'ACTIVE' }).select('_id employeeId personalDetails employmentDetails').lean(),
      SchoolUser.find({ schoolId, status: 'ACTIVE' }).select('_id employeeId name firstName lastName role department').lean(),
    ]);

    const formattedTeachers = teachers.map((t) => ({
      employeeRefId: t._id.toString(),
      employeeType: 'TEACHER',
      employeeId: t.employeeId || `TCH-${t._id.toString().slice(-4).toUpperCase()}`,
      employeeName: `${t.personalDetails?.firstName || ''} ${t.personalDetails?.lastName || ''}`.trim() || 'Teacher',
      employeeRole: 'TEACHER',
      department: t.employmentDetails?.department || 'Academic',
      status,
      leaveType: '',
      leaveReason: '',
      clockIn: '08:00 AM',
      clockOut: '03:00 PM',
      remarks: '',
    }));

    const formattedStaff = staff.map((s) => ({
      employeeRefId: s._id.toString(),
      employeeType: 'STAFF',
      employeeId: s.employeeId || `EMP-${s._id.toString().slice(-4).toUpperCase()}`,
      employeeName: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff',
      employeeRole: s.role,
      department: s.department || s.role,
      status,
      leaveType: '',
      leaveReason: '',
      clockIn: '08:30 AM',
      clockOut: '04:30 PM',
      remarks: '',
    }));

    const allRecords = [...formattedTeachers, ...formattedStaff];
    return this.saveDailyAttendance(schoolId, date, allRecords);
  }

  async getMonthlySummary(schoolId, monthStr) {
    // monthStr e.g. '2026-08'
    const dateRegex = new RegExp(`^${monthStr}`);
    
    const [teachers, staff, records] = await Promise.all([
      Teacher.find({ schoolId, status: 'ACTIVE' }).select('_id employeeId personalDetails employmentDetails').lean(),
      SchoolUser.find({ schoolId, status: 'ACTIVE' }).select('_id employeeId name firstName lastName role department').lean(),
      StaffAttendance.find({ schoolId, date: { $regex: dateRegex } }).lean(),
    ]);

    const [yearStr, monthNumStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = parseInt(monthNumStr, 10) || (new Date().getMonth() + 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Map records by employeeRefId and date
    const recordByEmpAndDate = new Map();
    records.forEach((r) => {
      const key = `${r.employeeRefId.toString()}_${r.date}`;
      recordByEmpAndDate.set(key, r);
    });

    const formattedEmployees = [
      ...teachers.map((t) => ({
        employeeRefId: t._id.toString(),
        employeeType: 'TEACHER',
        employeeId: t.employeeId || `TCH-${t._id.toString().slice(-4).toUpperCase()}`,
        name: `${t.personalDetails?.firstName || ''} ${t.personalDetails?.lastName || ''}`.trim() || 'Teacher',
        role: 'Teacher',
        department: t.employmentDetails?.department || 'Academic',
      })),
      ...staff.map((s) => ({
        employeeRefId: s._id.toString(),
        employeeType: 'STAFF',
        employeeId: s.employeeId || `EMP-${s._id.toString().slice(-4).toUpperCase()}`,
        name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff',
        role: s.role,
        department: s.department || s.role,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));

    let grandPresent = 0;
    let grandAbsent = 0;
    let grandLeave = 0;
    let grandHalfDay = 0;

    const employeeRows = formattedEmployees.map((emp) => {
      const dayMap = {};
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;
      let halfDayCount = 0;
      let recordedDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const dayPadded = String(day).padStart(2, '0');
        const fullDate = `${monthStr}-${dayPadded}`;
        const rec = recordByEmpAndDate.get(`${emp.employeeRefId}_${fullDate}`);

        if (rec) {
          dayMap[day] = {
            date: fullDate,
            status: rec.status,
            clockIn: rec.clockIn,
            clockOut: rec.clockOut,
            remarks: rec.remarks,
          };
          recordedDays++;
          if (rec.status === 'PRESENT') presentCount++;
          else if (rec.status === 'ABSENT') absentCount++;
          else if (rec.status === 'LEAVE') leaveCount++;
          else if (rec.status === 'HALF_DAY') halfDayCount++;
        } else {
          dayMap[day] = null;
        }
      }

      grandPresent += presentCount;
      grandAbsent += absentCount;
      grandLeave += leaveCount;
      grandHalfDay += halfDayCount;

      const effectivePresent = presentCount + halfDayCount * 0.5;
      const percentage = recordedDays > 0 ? Math.round((effectivePresent / recordedDays) * 100) : 0;

      return {
        ...emp,
        days: dayMap,
        stats: {
          present: presentCount,
          absent: absentCount,
          leave: leaveCount,
          halfDay: halfDayCount,
          recordedDays,
          percentage,
        },
      };
    });

    const totalLogged = grandPresent + grandAbsent + grandLeave + grandHalfDay;
    const avgRate = totalLogged > 0 ? Math.round(((grandPresent + grandHalfDay * 0.5) / totalLogged) * 100) : 0;

    return {
      monthStr,
      daysInMonth,
      employees: employeeRows,
      records,
      overallStats: {
        totalLogged,
        totalPresent: grandPresent,
        totalAbsent: grandAbsent,
        totalLeave: grandLeave,
        totalHalfDay: grandHalfDay,
        averagePercentage: avgRate,
      },
    };
  }

  async getAttendanceReport(schoolId, query = {}) {
    const filter = { schoolId };

    if (query.startDate && query.endDate) {
      filter.date = { $gte: query.startDate, $lte: query.endDate };
    } else if (query.startDate) {
      filter.date = { $gte: query.startDate };
    } else if (query.endDate) {
      filter.date = { $lte: query.endDate };
    } else if (query.date) {
      filter.date = query.date;
    }

    if (query.role && query.role !== 'ALL') {
      filter.employeeRole = query.role.toUpperCase();
    }

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { employeeName: regex },
        { employeeId: regex },
        { department: regex },
        { employeeRole: regex },
      ];
    }

    return StaffAttendance.find(filter)
      .sort({ date: -1, employeeName: 1 })
      .lean();
  }
}

export const staffAttendanceRepository = new StaffAttendanceRepository();
