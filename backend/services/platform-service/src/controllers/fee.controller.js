import { feeService } from '../services/fee.service.js';
import { feePaymentService } from '../services/feePayment.service.js';
import { financeTransactionService } from '../services/financeTransaction.service.js';
import { schoolId } from '../utils/tenant.js';

// Fee Heads
export async function listFeeHeads(req, res, next) {
  try {
    const data = await feeService.listFeeHeads(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createFeeHead(req, res, next) {
  try {
    const data = await feeService.createFeeHead(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Fee head created', data });
  } catch (error) {
    next(error);
  }
}

// Fee Structures
export async function listFeeStructures(req, res, next) {
  try {
    const data = await feeService.listFeeStructures(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createFeeStructure(req, res, next) {
  try {
    const data = await feeService.createFeeStructure(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Fee structure created', data });
  } catch (error) {
    next(error);
  }
}

// Student Fee Assignments
export async function listStudentFeeAssignments(req, res, next) {
  try {
    const data = await feeService.listStudentFeeAssignments(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createStudentFeeAssignment(req, res, next) {
  try {
    const data = await feeService.createStudentFeeAssignment(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Fee assigned to student', data });
  } catch (error) {
    next(error);
  }
}

// Fee Collection (Payment)
export async function collectFeePayment(req, res, next) {
  try {
    const result = await feePaymentService.collectPayment(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Payment collected successfully', data: result });
  } catch (error) {
    next(error);
  }
}

export async function listFeePayments(req, res, next) {
  try {
    const data = await feePaymentService.listPayments(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// Finance Transactions
export async function listFinanceTransactions(req, res, next) {
  try {
    const data = await financeTransactionService.listTransactions(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getFinanceSummary(req, res, next) {
  try {
    const data = await financeTransactionService.getFinanceSummary(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function recordExpense(req, res, next) {
  try {
    const data = await financeTransactionService.recordExpense(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Expense recorded', data });
  } catch (error) {
    next(error);
  }
}