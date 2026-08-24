import { AppError } from '../../../shared/AppError.js';
import { staffAttendanceRepository } from '../repositories/staffAttendance.repository.js';

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

class StaffAttendanceService {
  async getDailyAttendance(schoolId, query = {}) {
    const date = (query.date || getTodayString()).trim();
    return staffAttendanceRepository.getDailyAttendance(schoolId, date, query);
  }

  async saveDailyAttendance(schoolId, payload = {}) {
    const date = (payload.date || getTodayString()).trim();
    const records = Array.isArray(payload.records) ? payload.records : [];

    if (!records.length) {
      throw new AppError('No attendance records provided to save', 400);
    }

    const result = await staffAttendanceRepository.saveDailyAttendance(schoolId, date, records);
    const updated = await staffAttendanceRepository.getDailyAttendance(schoolId, date);

    return {
      success: true,
      message: `Staff attendance saved for ${date} (${records.length} records updated)`,
      stats: updated.stats,
      data: updated.items,
    };
  }

  async updateSingleStatus(schoolId, employeeRefId, payload = {}) {
    const date = (payload.date || getTodayString()).trim();
    const status = (payload.status || 'PRESENT').toUpperCase();

    const allowed = ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'HOLIDAY'];
    if (!allowed.includes(status)) {
      throw new AppError(`Invalid status: ${status}`, 400);
    }

    const data = {
      status,
      leaveType: status === 'LEAVE' ? payload.leaveType || 'CASUAL' : '',
      leaveReason: status === 'LEAVE' ? payload.leaveReason || '' : '',
      clockIn: payload.clockIn || '08:00 AM',
      clockOut: payload.clockOut || '03:00 PM',
      remarks: payload.remarks || '',
    };

    if (payload.employeeId) data.employeeId = payload.employeeId;
    if (payload.employeeName) data.employeeName = payload.employeeName;
    if (payload.employeeRole) data.employeeRole = payload.employeeRole;
    if (payload.department) data.department = payload.department;
    if (payload.employeeType) data.employeeType = payload.employeeType;

    const saved = await staffAttendanceRepository.updateSingleStatus(schoolId, date, employeeRefId, data);
    return saved.toPublicJSON();
  }

  async markAllStatus(schoolId, payload = {}) {
    const date = (payload.date || getTodayString()).trim();
    const status = (payload.status || 'PRESENT').toUpperCase();

    await staffAttendanceRepository.markAllStatus(schoolId, date, status);
    const updated = await staffAttendanceRepository.getDailyAttendance(schoolId, date);

    return {
      success: true,
      message: `All staff marked as ${status} for ${date}`,
      stats: updated.stats,
      data: updated.items,
    };
  }

  async getMonthlySummary(schoolId, query = {}) {
    const now = new Date();
    const year = query.year || now.getFullYear();
    const monthNum = String(query.month || (now.getMonth() + 1)).padStart(2, '0');
    const monthStr = `${year}-${monthNum}`;

    return staffAttendanceRepository.getMonthlySummary(schoolId, monthStr);
  }

  async getAttendanceReport(schoolId, query = {}) {
    const records = await staffAttendanceRepository.getAttendanceReport(schoolId, query);
    return {
      success: true,
      total: records.length,
      data: records.map((r) => ({
        id: r._id.toString(),
        date: r.date,
        employeeRefId: r.employeeRefId.toString(),
        employeeType: r.employeeType,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        employeeRole: r.employeeRole,
        department: r.department,
        status: r.status,
        leaveType: r.leaveType,
        leaveReason: r.leaveReason,
        remarks: r.remarks,
        recordedBy: r.recordedBy,
        createdAt: r.createdAt,
      })),
    };
  }
}

export const staffAttendanceService = new StaffAttendanceService();
