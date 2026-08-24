import mongoose from 'mongoose';
import { Payroll } from '../models/Payroll.js';
import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';

class PayrollRepository {
  async listPayrolls(schoolId, query = {}) {
    const filter = { schoolId };

    if (query.month && query.month !== 'ALL') {
      filter.payrollMonth = query.month;
    }

    if (query.status && query.status !== 'ALL') {
      filter.paymentStatus = query.status.toUpperCase();
    }

    if (query.role && query.role !== 'ALL') {
      filter.employeeRole = query.role.toUpperCase();
    }

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { employeeName: regex },
        { employeeId: regex },
        { employeeEmail: regex },
        { department: regex },
        { designation: regex },
        { employeeRole: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 5));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Payroll.find(filter)
        .sort({ payrollDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payroll.countDocuments(filter),
    ]);

    // Aggregate stats for current school and optionally month
    let schoolObjectId = schoolId;
    try {
      if (mongoose.Types.ObjectId.isValid(schoolId)) {
        schoolObjectId = new mongoose.Types.ObjectId(schoolId);
      }
    } catch {
      schoolObjectId = schoolId;
    }

    const statsMatch = { schoolId: schoolObjectId };
    if (query.month && query.month !== 'ALL') {
      statsMatch.payrollMonth = query.month;
    }

    let firstStats = null;
    try {
      const aggResults = await Payroll.aggregate([
        { $match: statsMatch },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: '$netSalary' },
            totalGross: { $sum: '$grossEarnings' },
            totalDeductions: { $sum: '$totalDeductions' },
            totalCount: { $sum: 1 },
            paidCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, 1, 0] },
            },
            processedCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'PROCESSED'] }, 1, 0] },
            },
            onHoldCount: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'ON_HOLD'] }, 1, 0] },
            },
          },
        },
      ]);
      firstStats = aggResults && aggResults.length > 0 ? aggResults[0] : null;
    } catch {
      firstStats = null;
    }

    const stats = {
      totalExpense: firstStats?.totalExpense || 0,
      totalGross: firstStats?.totalGross || 0,
      totalDeductions: firstStats?.totalDeductions || 0,
      totalCount: firstStats?.totalCount || 0,
      paidCount: firstStats?.paidCount || 0,
      processedCount: firstStats?.processedCount || 0,
      onHoldCount: firstStats?.onHoldCount || 0,
    };

    return {
      items,
      total,
      stats,
      page,
      limit,
    };
  }

  async findPayrollById(schoolId, id) {
    return Payroll.findOne({ schoolId, _id: id });
  }

  async createPayroll(data) {
    return Payroll.create(data);
  }

  async updatePayroll(schoolId, id, updates) {
    return Payroll.findOneAndUpdate(
      { schoolId, _id: id },
      { $set: updates },
      { new: true, runValidators: true }
    );
  }

  async deletePayroll(schoolId, id) {
    return Payroll.findOneAndDelete({ schoolId, _id: id });
  }

  async releaseAllPayrolls(schoolId, month) {
    const filter = { schoolId, paymentStatus: 'PROCESSED' };
    if (month && month !== 'ALL') {
      filter.payrollMonth = month;
    }
    return Payroll.updateMany(filter, {
      $set: {
        paymentStatus: 'PAID',
        paymentDate: new Date(),
      },
    });
  }

  async getEligibleEmployees(schoolId) {
    const [teachers, staff] = await Promise.all([
      Teacher.find({ schoolId, status: 'ACTIVE' })
        .select('_id employeeId personalDetails employmentDetails payroll status')
        .lean(),
      SchoolUser.find({ schoolId, status: 'ACTIVE' })
        .select('_id employeeId name firstName lastName email role department designation basicSalary bankDetails status')
        .lean(),
    ]);

    const formattedTeachers = teachers.map((t) => {
      const name = `${t.personalDetails?.firstName || ''} ${t.personalDetails?.lastName || ''}`.trim() || 'Teacher';
      const basicSalary = Number(t.payroll?.basicSalary) || 35000;
      return {
        id: t._id.toString(),
        type: 'TEACHER',
        employeeId: t.employeeId || `TCH-${t._id.toString().slice(-4).toUpperCase()}`,
        name,
        email: t.personalDetails?.email || '',
        role: 'TEACHER',
        roleLabel: 'Teacher',
        department: t.employmentDetails?.department || 'Academic',
        designation: t.employmentDetails?.designation || 'Teacher',
        basicSalary,
        allowances: Math.round(basicSalary * 0.15), // 15% estimated default
        bankDetails: {
          accountName: t.payroll?.accountHolderName || name,
          accountNumber: t.payroll?.accountNumber || '',
          ifscCode: t.payroll?.ifsc || '',
          bankName: t.payroll?.bankName || '',
          branchName: t.payroll?.branch || '',
          accountType: 'SALARY',
        },
      };
    });

    const formattedStaff = staff.map((s) => {
      const name = s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff';
      const basicSalary = Number(s.basicSalary) || 30000;
      return {
        id: s._id.toString(),
        type: 'STAFF',
        employeeId: s.employeeId || `EMP-${s._id.toString().slice(-4).toUpperCase()}`,
        name,
        email: s.email || '',
        role: s.role,
        roleLabel: s.role,
        department: s.department || s.role,
        designation: s.designation || s.role,
        basicSalary,
        allowances: Math.round(basicSalary * 0.12), // 12% estimated default
        bankDetails: s.bankDetails || {},
      };
    });

    return [...formattedTeachers, ...formattedStaff].sort((a, b) => a.name.localeCompare(b.name));
  }
}

export const payrollRepository = new PayrollRepository();
