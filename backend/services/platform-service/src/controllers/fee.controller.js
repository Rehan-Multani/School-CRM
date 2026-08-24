import { feeService } from '../services/fee.service.js';

function schoolId(req) {
  return req.user?.sub;
}

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
    res.status(201).json({ success: true, data, message: 'Fee head created' });
  } catch (error) {
    next(error);
  }
}

export async function updateFeeHead(req, res, next) {
  try {
    const data = await feeService.updateHead(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Fee head updated' });
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
    res.status(201).json({ success: true, data, message: 'Fee structure created' });
  } catch (error) {
    next(error);
  }
}

export async function updateFeeStructure(req, res, next) {
  try {
    const data = await feeService.updateStructure(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Fee structure updated' });
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
    res.status(201).json({ success: true, data, message: 'Fee item added to structure' });
  } catch (error) {
    next(error);
  }
}

export async function updateStructureItem(req, res, next) {
  try {
    const data = await feeService.updateStructureItem(schoolId(req), req.params.id, req.body);
    res.json({ success: true, data, message: 'Fee structure item updated' });
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
    res.status(201).json({ success: true, data, message: 'Fee invoice generated' });
  } catch (error) {
    next(error);
  }
}

export async function payFeeInvoice(req, res, next) {
  try {
    const data = await feeService.payInvoice(schoolId(req), req.params.invoiceId, req.body, req.user?.email || '');
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
