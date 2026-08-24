import { AppError } from '../../../shared/AppError.js';
import { payrollRepository } from '../repositories/payroll.repository.js';
import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  return text;
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseMonthString(date = new Date()) {
  const d = new Date(date);
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

class PayrollService {
  async listPayrolls(schoolId, query = {}) {
    const result = await payrollRepository.listPayrolls(schoolId, query);
    return {
      data: result.items.map((item) => item.toPublicJSON()),
      stats: result.stats,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  }

  async getPayroll(schoolId, id) {
    const payroll = await payrollRepository.findPayrollById(schoolId, id);
    if (!payroll) throw new AppError('Payroll record not found', 404);
    return payroll.toPublicJSON();
  }

  async getEligibleEmployees(schoolId) {
    return payrollRepository.getEligibleEmployees(schoolId);
  }

  async createPayroll(schoolId, payload = {}) {
    const employeeRefId = requireText(payload.employeeRefId || payload.employeeId, 'Employee selection');
    const employeeType = (payload.employeeType || 'STAFF').toUpperCase();
    const payrollMonth = payload.payrollMonth?.trim() || parseMonthString();
    const payrollDate = payload.payrollDate ? new Date(payload.payrollDate) : new Date();

    // Fetch employee snapshot if name or details not fully passed
    let employeeName = optionalText(payload.employeeName);
    let employeeEmail = optionalText(payload.employeeEmail);
    let employeeId = optionalText(payload.employeeCode || payload.employeeId);
    let employeeRole = optionalText(payload.employeeRole || payload.role) || 'Staff';
    let department = optionalText(payload.department);
    let designation = optionalText(payload.designation);
    let bankDetails = payload.bankDetails || {};

    if (employeeType === 'TEACHER') {
      const teacher = await Teacher.findOne({ schoolId, _id: employeeRefId });
      if (teacher) {
        employeeName = employeeName || `${teacher.personalDetails?.firstName || ''} ${teacher.personalDetails?.lastName || ''}`.trim() || 'Teacher';
        employeeEmail = employeeEmail || teacher.personalDetails?.email || '';
        employeeId = employeeId || teacher.employeeId || `TCH-${teacher._id.toString().slice(-4).toUpperCase()}`;
        employeeRole = 'TEACHER';
        department = department || teacher.employmentDetails?.department || 'Academic';
        designation = designation || teacher.employmentDetails?.designation || 'Teacher';
        if (!bankDetails.accountNumber && teacher.payroll) {
          bankDetails = {
            accountName: teacher.payroll.accountHolderName || employeeName,
            accountNumber: teacher.payroll.accountNumber || '',
            ifscCode: teacher.payroll.ifsc || '',
            bankName: teacher.payroll.bankName || '',
            branchName: teacher.payroll.branch || '',
            accountType: 'SALARY',
          };
        }
      }
    } else {
      const staff = await SchoolUser.findOne({ schoolId, _id: employeeRefId });
      if (staff) {
        employeeName = employeeName || staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim();
        employeeEmail = employeeEmail || staff.email || '';
        employeeId = employeeId || staff.employeeId;
        employeeRole = staff.role;
        department = department || staff.department || staff.role;
        designation = designation || staff.designation || staff.role;
        if (!bankDetails.accountNumber && staff.bankDetails) {
          bankDetails = staff.bankDetails;
        }
      }
    }

    if (!employeeName) {
      throw new AppError('Employee profile could not be resolved', 400);
    }

    // Monetary computations
    const basicSalary = Math.max(0, Number(payload.basicSalary) || 0);
    const allowances = Math.max(0, Number(payload.allowances) || 0);
    const incentive = Math.max(0, Number(payload.incentive) || 0);
    const overtime = Math.max(0, Number(payload.overtime) || 0);
    const bonus = Math.max(0, Number(payload.bonus) || 0);
    const grossEarnings = basicSalary + allowances + incentive + overtime + bonus;

    const leaveDeduction = Math.max(0, Number(payload.leaveDeduction) || 0);
    const otherDeduction = Math.max(0, Number(payload.otherDeduction) || 0);
    const advanceLoanDeduction = Math.max(0, Number(payload.advanceLoanDeduction) || 0);
    const totalDeductions = leaveDeduction + otherDeduction + advanceLoanDeduction;

    const netSalary = Math.max(0, grossEarnings - totalDeductions);

    const paymentStatus = payload.paymentStatus && ['PROCESSED', 'PAID', 'ON_HOLD'].includes(payload.paymentStatus.toUpperCase())
      ? payload.paymentStatus.toUpperCase()
      : 'PROCESSED';

    // If payroll already exists for this employee in this month, update it seamlessly!
    const existing = await payrollRepository.listPayrolls(schoolId, {
      month: payrollMonth,
      search: employeeName,
    });
    const alreadyProcessed = existing.items.find(
      (p) => p.employeeRefId.toString() === employeeRefId && p.payrollMonth === payrollMonth
    );
    if (alreadyProcessed) {
      const updated = await payrollRepository.updatePayroll(schoolId, alreadyProcessed._id, {
        basicSalary,
        allowances,
        incentive,
        overtime,
        bonus,
        grossEarnings,
        leaveDeduction,
        otherDeduction,
        advanceLoanDeduction,
        totalDeductions,
        netSalary,
        paymentStatus,
        paymentMethod: payload.paymentMethod || alreadyProcessed.paymentMethod,
        payrollDate,
        remarks: payload.remarks !== undefined ? payload.remarks : alreadyProcessed.remarks,
      });

      return updated.toPublicJSON();
    }

    const created = await payrollRepository.createPayroll({
      schoolId,
      employeeRefId,
      employeeType,
      employeeId: employeeId || 'EMP-100',
      employeeName,
      employeeEmail,
      employeeRole,
      department,
      designation,
      payrollMonth,
      payrollDate,
      basicSalary,
      allowances,
      incentive,
      overtime,
      bonus,
      grossEarnings,
      leaveDeduction,
      otherDeduction,
      advanceLoanDeduction,
      totalDeductions,
      netSalary,
      paymentStatus,
      paymentMethod: payload.paymentMethod || 'BANK_TRANSFER',
      paymentDate: paymentStatus === 'PAID' ? new Date() : null,
      transactionRef: optionalText(payload.transactionRef),
      remarks: optionalText(payload.remarks),
      bankDetails,
    });

    return created.toPublicJSON();
  }

  async updatePayrollStatus(schoolId, id, status, details = {}) {
    const validStatuses = ['PROCESSED', 'PAID', 'ON_HOLD', 'CANCELLED'];
    const cleanStatus = (status || '').toUpperCase();
    if (!validStatuses.includes(cleanStatus)) {
      throw new AppError(`Invalid status: ${status}`, 400);
    }

    const updates = { paymentStatus: cleanStatus };
    if (cleanStatus === 'PAID') {
      updates.paymentDate = details.paymentDate ? new Date(details.paymentDate) : new Date();
      if (details.transactionRef) updates.transactionRef = details.transactionRef;
      if (details.paymentMethod) updates.paymentMethod = details.paymentMethod;
    }

    const updated = await payrollRepository.updatePayroll(schoolId, id, updates);
    if (!updated) throw new AppError('Payroll record not found', 404);
    return updated.toPublicJSON();
  }

  async releaseAll(schoolId, month) {
    const res = await payrollRepository.releaseAllPayrolls(schoolId, month);
    return {
      success: true,
      modifiedCount: res.modifiedCount,
      message: `${res.modifiedCount} payroll records marked as PAID successfully.`,
    };
  }

  async deletePayroll(schoolId, id) {
    const deleted = await payrollRepository.deletePayroll(schoolId, id);
    if (!deleted) throw new AppError('Payroll record not found', 404);
    return { success: true, message: 'Payroll record deleted successfully' };
  }
}

export const payrollService = new PayrollService();
