import { payrollService } from '../services/payroll.service.js';

function schoolId(req) {
  return req.user?.sub;
}

export async function listPayrolls(req, res, next) {
  try {
    const result = await payrollService.listPayrolls(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.data,
      stats: result.stats,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEligibleEmployees(req, res, next) {
  try {
    const data = await payrollService.getEligibleEmployees(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createPayroll(req, res, next) {
  try {
    const data = await payrollService.createPayroll(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      data,
      message: `Payroll created for ${data.employeeName} (${data.payrollMonth})`,
    });
  } catch (error) {
    next(error);
  }
}

export async function getPayroll(req, res, next) {
  try {
    const data = await payrollService.getPayroll(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updatePayrollStatus(req, res, next) {
  try {
    const data = await payrollService.updatePayrollStatus(
      schoolId(req),
      req.params.id,
      req.body.status,
      req.body
    );
    res.json({ success: true, data, message: `Payroll status updated to ${data.paymentStatus}` });
  } catch (error) {
    next(error);
  }
}

export async function releaseAllPayrolls(req, res, next) {
  try {
    const result = await payrollService.releaseAll(schoolId(req), req.body.month);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function deletePayroll(req, res, next) {
  try {
    const result = await payrollService.deletePayroll(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
