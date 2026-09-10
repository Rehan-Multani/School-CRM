import { feeService } from '../services/fee.service.js';
import { feePaymentService } from '../services/feePayment.service.js';
import { financeTransactionService } from '../services/financeTransaction.service.js';
import { schoolId, performedBy } from '../utils/tenant.js';

// ===================== FEE HEADS =====================
export async function listFeeHeads(req, res, next) {
  try {
    const result = await feeService.listHeads(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getFeeHead(req, res, next) {
  try {
    const data = await feeService.getHead(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createFeeHead(req, res, next) {
  try {
    const data = await feeService.createHead(schoolId(req), req.body);
    res.status(201).json({ success: true, data, message: 'Fee head created successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateFeeHead(req, res, next) {
  try {
    const data = await feeService.updateHead(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Fee head updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function deleteFeeHead(req, res, next) {
  try {
    const result = await feeService.deleteHead(schoolId(req), req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function seedDefaultFeeHeads(req, res, next) {
  try {
    const result = await feeService.seedDefaultHeads(schoolId(req));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function bulkCreateFeeHeads(req, res, next) {
  try {
    const result = await feeService.bulkCreateHeads(schoolId(req), req.body);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ===================== FEE STRUCTURES =====================
export async function listFeeStructures(req, res, next) {
  try {
    const result = await feeService.listStructures(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getFeeStructure(req, res, next) {
  try {
    const data = await feeService.getStructure(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createFeeStructure(req, res, next) {
  try {
    const data = await feeService.createStructure(schoolId(req), req.body);
    res.status(201).json({ success: true, data, message: 'Fee structure created successfully' });
  } catch (error) {
    next(error);
  }
}

export async function updateFeeStructure(req, res, next) {
  try {
    const data = await feeService.updateStructure(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Fee structure updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function deleteFeeStructure(req, res, next) {
  try {
    const result = await feeService.deleteStructure(schoolId(req), req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ===================== FEE STRUCTURE ITEMS =====================
export async function listStructureItems(req, res, next) {
  try {
    const data = await feeService.listStructureItems(schoolId(req), req.params.structureId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function addStructureItem(req, res, next) {
  try {
    const data = await feeService.addStructureItem(schoolId(req), req.params.structureId, req.body);
    res.status(201).json({ success: true, data, message: 'Fee component added to structure' });
  } catch (error) {
    next(error);
  }
}

export async function updateStructureItem(req, res, next) {
  try {
    const data = await feeService.updateStructureItem(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Fee component updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function deleteStructureItem(req, res, next) {
  try {
    const result = await feeService.deleteStructureItem(schoolId(req), req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ===================== STUDENT FEE ASSIGNMENTS =====================
export async function listStudentAssignments(req, res, next) {
  try {
    const data = await feeService.listStudentAssignments(schoolId(req), req.params.studentId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function autoAssignStudentFees(req, res, next) {
  try {
    const result = await feeService.autoAssignStudentFees(schoolId(req), req.params.studentId, req.body);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function updateStudentAssignment(req, res, next) {
  try {
    const data = await feeService.updateStudentAssignment(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Student fee assignment updated' });
  } catch (error) {
    next(error);
  }
}

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

// ===================== INVOICES & PAYMENTS =====================
export async function listFeeInvoices(req, res, next) {
  try {
    const result = await feeService.listInvoices(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getFeeInvoice(req, res, next) {
  try {
    const data = await feeService.getInvoice(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function generateFeeInvoice(req, res, next) {
  try {
    const data = await feeService.generateInvoice(schoolId(req), req.body);
    res.status(201).json({ success: true, data, message: 'Fee invoice generated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function payFeeInvoice(req, res, next) {
  try {
    const data = await feeService.payInvoice(schoolId(req), req.params.invoiceId, req.body, performedBy(req));
    res.status(201).json({ success: true, data, message: 'Fee payment recorded successfully' });
  } catch (error) {
    next(error);
  }
}

export async function listFeePayments(req, res, next) {
  try {
    const result = await feeService.listPayments(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getFeePayment(req, res, next) {
  try {
    const data = await feeService.getPayment(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function collectFeePayment(req, res, next) {
  try {
    // If request body contains studentFeeAssignmentId, use feePaymentService; if invoiceId, use feeService.payInvoice
    if (req.body?.invoiceId) {
      const result = await feeService.payInvoice(schoolId(req), req.body.invoiceId, req.body, performedBy(req));
      return res.status(201).json({ success: true, message: 'Payment collected successfully', data: result });
    }
    const result = await feePaymentService.collectPayment(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Payment collected successfully', data: result });
  } catch (error) {
    next(error);
  }
}

// ===================== FINANCE TRANSACTIONS =====================
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