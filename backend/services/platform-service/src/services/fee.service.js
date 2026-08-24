import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { feeRepository } from '../repositories/fee.repository.js';
import { academicRepository } from '../repositories/academic.repository.js';
import { studentRepository } from '../repositories/student.repository.js';
import { FEE_CATEGORIES, FEE_HEAD_STATUSES } from '../models/FeeHead.js';
import { FEE_STRUCTURE_STATUSES } from '../models/FeeStructure.js';
import { FEE_FREQUENCIES } from '../models/FeeStructureItem.js';
import { DISCOUNT_TYPES, ASSIGNMENT_STATUSES } from '../models/StudentFeeAssignment.js';
import { FEE_PAYMENT_METHODS } from '../models/FeePayment.js';

const DEFAULT_FEE_HEADS = [
  { name: 'Tuition Fee', code: 'TUITION', category: 'ACADEMIC', description: 'Regular academic tuition fees' },
  { name: 'Admission Fee', code: 'ADMISSION', category: 'ACADEMIC', description: 'One-time admission registration fee' },
  { name: 'Examination Fee', code: 'EXAM', category: 'ACADEMIC', description: 'Term/Quarterly examination assessment charges' },
  { name: 'Library Fee', code: 'LIBRARY', category: 'ACADEMIC', description: 'Annual library access and book maintenance' },
  { name: 'Sports & Activity Fee', code: 'ACTIVITY', category: 'ACTIVITY', description: 'Sports equipment, physical education, and co-curriculars' },
  { name: 'Computer Lab Fee', code: 'COMPUTER', category: 'ACADEMIC', description: 'Smart classes and computer laboratory usage' },
  { name: 'Transport Fee', code: 'TRANSPORT', category: 'TRANSPORT', description: 'Optional school bus/van transport services' },
  { name: 'Hostel & Boarding Fee', code: 'HOSTEL', category: 'HOSTEL', description: 'Optional residential hostel facilities and meals' },
];

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  return text;
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureOption(value, options, label) {
  const text = requireText(value, label);
  if (!options.includes(text)) throw new AppError(`${label} is invalid`, 400);
  return text;
}

function ensureNumber(value, label, min = 0) {
  const num = Number(value);
  if (isNaN(num) || num < min) throw new AppError(`${label} must be a number >= ${min}`, 400);
  return num;
}

export class FeeService {
  // ==========================================
  // FEE HEADS
  // ==========================================
  async listHeads(schoolId, query = {}) {
    const result = await feeRepository.listHeads(schoolId, query);
    return {
      data: result.items.map((item) => item.toPublicJSON()),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async getHead(schoolId, id) {
    const head = await feeRepository.findHeadById(schoolId, id);
    if (!head) throw new AppError('Fee head not found', 404);
    return head.toPublicJSON();
  }

  async createHead(schoolId, payload = {}) {
    const name = requireText(payload.name, 'Fee Head Name');
    const code = requireText(payload.code, 'Fee Head Code').toUpperCase();
    const category = payload.category ? ensureOption(payload.category, FEE_CATEGORIES, 'Category') : 'ACADEMIC';
    const status = payload.status ? ensureOption(payload.status, FEE_HEAD_STATUSES, 'Status') : 'ACTIVE';
    const description = optionalText(payload.description);

    const existing = await feeRepository.findHeadByNameOrCode(schoolId, name, code);
    if (existing) {
      if (existing.name.toLowerCase() === name.toLowerCase()) {
        throw new AppError('A fee head with this name already exists', 409);
      }
      throw new AppError('A fee head with this code already exists', 409);
    }

    const created = await feeRepository.createHead({
      schoolId,
      name,
      code,
      category,
      description,
      status,
    });

    return created.toPublicJSON();
  }

  async updateHead(schoolId, id, payload = {}) {
    const head = await feeRepository.findHeadById(schoolId, id);
    if (!head) throw new AppError('Fee head not found', 404);

    const updates = {};
    if (payload.name !== undefined) {
      const name = requireText(payload.name, 'Fee Head Name');
      const existing = await feeRepository.findHeadByNameOrCode(schoolId, name, null, id);
      if (existing) throw new AppError('A fee head with this name already exists', 409);
      updates.name = name;
    }

    if (payload.code !== undefined) {
      const code = requireText(payload.code, 'Fee Head Code').toUpperCase();
      const existing = await feeRepository.findHeadByNameOrCode(schoolId, null, code, id);
      if (existing) throw new AppError('A fee head with this code already exists', 409);
      updates.code = code;
    }

    if (payload.category !== undefined) {
      updates.category = ensureOption(payload.category, FEE_CATEGORIES, 'Category');
    }

    if (payload.status !== undefined) {
      updates.status = ensureOption(payload.status, FEE_HEAD_STATUSES, 'Status');
    }

    if (payload.description !== undefined) {
      updates.description = optionalText(payload.description);
    }

    const updated = await feeRepository.updateHead(schoolId, id, updates);
    return updated.toPublicJSON();
  }

  async deleteHead(schoolId, id) {
    const head = await feeRepository.findHeadById(schoolId, id);
    if (!head) throw new AppError('Fee head not found', 404);
    await feeRepository.deleteHead(schoolId, id);
    return { success: true, message: 'Fee head deleted' };
  }

  async seedDefaultHeads(schoolId) {
    let createdCount = 0;
    for (const head of DEFAULT_FEE_HEADS) {
      const existing = await feeRepository.findHeadByNameOrCode(schoolId, head.name, head.code);
      if (!existing) {
        await feeRepository.createHead({ schoolId, ...head, status: 'ACTIVE' });
        createdCount++;
      }
    }
    return { message: `Seeded ${createdCount} default fee heads`, createdCount };
  }

  // ==========================================
  // FEE STRUCTURES
  // ==========================================
  async listStructures(schoolId, query = {}) {
    const result = await feeRepository.listStructures(schoolId, query);
    // Enrich with item counts
    const data = await Promise.all(
      result.items.map(async (st) => {
        const itemsCount = await feeRepository.countStructureItems(st._id);
        const json = st.toPublicJSON();
        json.academicYear = st.academicYearId ? {
          id: st.academicYearId._id?.toString() || st.academicYearId.toString(),
          name: st.academicYearId.name,
          code: st.academicYearId.code,
        } : null;
        json.class = st.classId ? {
          id: st.classId._id?.toString() || st.classId.toString(),
          name: st.classId.name,
          code: st.classId.code,
        } : null;
        json.itemsCount = itemsCount;
        return json;
      })
    );

    return {
      data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async getStructure(schoolId, id) {
    const structure = await feeRepository.findStructureById(schoolId, id);
    if (!structure) throw new AppError('Fee structure not found', 404);

    const items = await feeRepository.listStructureItems(schoolId, id);
    const json = structure.toPublicJSON();
    json.academicYear = structure.academicYearId ? {
      id: structure.academicYearId._id?.toString() || structure.academicYearId.toString(),
      name: structure.academicYearId.name,
      code: structure.academicYearId.code,
    } : null;
    json.class = structure.classId ? {
      id: structure.classId._id?.toString() || structure.classId.toString(),
      name: structure.classId.name,
      code: structure.classId.code,
    } : null;
    json.items = items.map((item) => {
      const itemJson = item.toPublicJSON();
      itemJson.feeHead = item.feeHeadId ? {
        id: item.feeHeadId._id?.toString() || item.feeHeadId.toString(),
        name: item.feeHeadId.name,
        code: item.feeHeadId.code,
        category: item.feeHeadId.category,
      } : null;
      return itemJson;
    });

    return json;
  }

  async createStructure(schoolId, payload = {}) {
    const academicYearId = requireText(payload.academicYearId, 'Academic Year');
    const classId = requireText(payload.classId, 'Class');
    const name = requireText(payload.name, 'Fee Structure Name');
    const description = optionalText(payload.description);
    const status = payload.status ? ensureOption(payload.status, FEE_STRUCTURE_STATUSES, 'Status') : 'ACTIVE';

    const year = await academicRepository.findYearById(schoolId, academicYearId);
    if (!year) throw new AppError('Academic year not found', 404);

    const cls = await academicRepository.findClassById(schoolId, classId);
    if (!cls) throw new AppError('Class not found', 404);

    const existing = await feeRepository.findStructureByClassAndYear(schoolId, classId, academicYearId);
    if (existing) {
      throw new AppError(`Fee structure for ${cls.name} (${year.name}) already exists`, 409);
    }

    const created = await feeRepository.createStructure({
      schoolId,
      academicYearId,
      classId,
      name,
      description,
      status,
    });

    return created.toPublicJSON();
  }

  async updateStructure(schoolId, id, payload = {}) {
    const structure = await feeRepository.findStructureById(schoolId, id);
    if (!structure) throw new AppError('Fee structure not found', 404);

    const updates = {};
    if (payload.name !== undefined) updates.name = requireText(payload.name, 'Fee Structure Name');
    if (payload.description !== undefined) updates.description = optionalText(payload.description);
    if (payload.status !== undefined) updates.status = ensureOption(payload.status, FEE_STRUCTURE_STATUSES, 'Status');

    const updated = await feeRepository.updateStructure(schoolId, id, updates);
    return updated.toPublicJSON();
  }

  async deleteStructure(schoolId, id) {
    const structure = await feeRepository.findStructureById(schoolId, id);
    if (!structure) throw new AppError('Fee structure not found', 404);

    await feeRepository.deleteStructureItemsByStructure(schoolId, id);
    await feeRepository.deleteStructure(schoolId, id);
    return { success: true, message: 'Fee structure and associated items deleted' };
  }

  // ==========================================
  // FEE STRUCTURE ITEMS
  // ==========================================
  async listStructureItems(schoolId, structureId) {
    const structure = await feeRepository.findStructureById(schoolId, structureId);
    if (!structure) throw new AppError('Fee structure not found', 404);

    const items = await feeRepository.listStructureItems(schoolId, structureId);
    return items.map((item) => {
      const json = item.toPublicJSON();
      json.feeHead = item.feeHeadId ? {
        id: item.feeHeadId._id?.toString() || item.feeHeadId.toString(),
        name: item.feeHeadId.name,
        code: item.feeHeadId.code,
        category: item.feeHeadId.category,
      } : null;
      return json;
    });
  }

  async addStructureItem(schoolId, structureId, payload = {}) {
    const structure = await feeRepository.findStructureById(schoolId, structureId);
    if (!structure) throw new AppError('Fee structure not found', 404);

    const feeHeadId = requireText(payload.feeHeadId, 'Fee Head');
    const amount = ensureNumber(payload.amount, 'Amount', 0);
    const frequency = payload.frequency ? ensureOption(payload.frequency, FEE_FREQUENCIES, 'Frequency') : 'MONTHLY';
    const dueDay = payload.dueDay !== undefined ? Number(payload.dueDay) : 10;
    const isOptional = Boolean(payload.isOptional);

    const head = await feeRepository.findHeadById(schoolId, feeHeadId);
    if (!head) throw new AppError('Fee head not found', 404);

    const existing = await feeRepository.findStructureItemByHead(structureId, feeHeadId);
    if (existing) {
      throw new AppError(`Fee head "${head.name}" is already added to this fee structure`, 409);
    }

    const created = await feeRepository.createStructureItem({
      schoolId,
      feeStructureId: structureId,
      feeHeadId,
      amount,
      frequency,
      dueDay,
      isOptional,
      applicableFrom: payload.applicableFrom || null,
      applicableTo: payload.applicableTo || null,
    });

    const enriched = await feeRepository.findStructureItemById(schoolId, created._id);
    const json = enriched.toPublicJSON();
    json.feeHead = enriched.feeHeadId ? {
      id: enriched.feeHeadId._id?.toString() || enriched.feeHeadId.toString(),
      name: enriched.feeHeadId.name,
      code: enriched.feeHeadId.code,
      category: enriched.feeHeadId.category,
    } : null;

    return json;
  }

  async updateStructureItem(schoolId, id, payload = {}) {
    const item = await feeRepository.findStructureItemById(schoolId, id);
    if (!item) throw new AppError('Fee structure item not found', 404);

    const updates = {};
    if (payload.amount !== undefined) updates.amount = ensureNumber(payload.amount, 'Amount', 0);
    if (payload.frequency !== undefined) updates.frequency = ensureOption(payload.frequency, FEE_FREQUENCIES, 'Frequency');
    if (payload.dueDay !== undefined) updates.dueDay = Number(payload.dueDay);
    if (payload.isOptional !== undefined) updates.isOptional = Boolean(payload.isOptional);
    if (payload.applicableFrom !== undefined) updates.applicableFrom = payload.applicableFrom;
    if (payload.applicableTo !== undefined) updates.applicableTo = payload.applicableTo;

    const updated = await feeRepository.updateStructureItem(schoolId, id, updates);
    const enriched = await feeRepository.findStructureItemById(schoolId, updated._id);
    const json = enriched.toPublicJSON();
    json.feeHead = enriched.feeHeadId ? {
      id: enriched.feeHeadId._id?.toString() || enriched.feeHeadId.toString(),
      name: enriched.feeHeadId.name,
      code: enriched.feeHeadId.code,
      category: enriched.feeHeadId.category,
    } : null;

    return json;
  }

  async deleteStructureItem(schoolId, id) {
    const item = await feeRepository.findStructureItemById(schoolId, id);
    if (!item) throw new AppError('Fee structure item not found', 404);
    await feeRepository.deleteStructureItem(schoolId, id);
    return { success: true, message: 'Fee item removed from structure' };
  }

  // ==========================================
  // STUDENT FEE ASSIGNMENTS
  // ==========================================
  async listStudentAssignments(schoolId, studentId) {
    const assignments = await feeRepository.listAssignmentsByStudent(schoolId, studentId);
    return assignments.map((a) => {
      const json = a.toPublicJSON();
      json.feeHead = a.feeHeadId ? {
        id: a.feeHeadId._id?.toString() || a.feeHeadId.toString(),
        name: a.feeHeadId.name,
        code: a.feeHeadId.code,
        category: a.feeHeadId.category,
      } : null;
      json.feeStructure = a.feeStructureId ? {
        id: a.feeStructureId._id?.toString() || a.feeStructureId.toString(),
        name: a.feeStructureId.name,
      } : null;
      return json;
    });
  }

  async autoAssignStudentFees(schoolId, studentId, { academicYearId, classId, enrollmentId, optionalFeeHeadIds = [] } = {}) {
    const structure = await feeRepository.findStructureByClassAndYear(schoolId, classId, academicYearId);
    if (!structure) {
      return { assignedCount: 0, message: 'No fee structure configured for this class and academic year' };
    }

    const items = await feeRepository.listStructureItems(schoolId, structure._id);
    if (items.length === 0) {
      return { assignedCount: 0, message: 'Fee structure has no items configured' };
    }

    let assignedCount = 0;
    for (const item of items) {
      // If optional and not in selected list, skip or set isOptedIn = false
      const isOptional = item.isOptional;
      const isOptedIn = !isOptional || (optionalFeeHeadIds || []).includes(item.feeHeadId._id?.toString() || item.feeHeadId.toString());

      const payload = {
        schoolId,
        studentId,
        enrollmentId,
        feeStructureId: structure._id,
        feeStructureItemId: item._id,
        feeHeadId: item.feeHeadId._id || item.feeHeadId,
        feeHeadName: item.feeHeadId.name || 'Fee',
        originalAmount: item.amount,
        frequency: item.frequency,
        discountType: 'NONE',
        discountValue: 0,
        discountAmount: 0,
        concessionAmount: 0,
        finalAmount: item.amount,
        isOptedIn,
        status: 'ACTIVE',
      };

      try {
        await feeRepository.createAssignment(payload);
        assignedCount++;
      } catch (err) {
        // Skip duplicate assignment
      }
    }

    return { assignedCount, message: `Successfully assigned ${assignedCount} fee components to student` };
  }

  async updateStudentAssignment(schoolId, id, payload = {}) {
    const assignment = await feeRepository.findAssignmentById(schoolId, id);
    if (!assignment) throw new AppError('Fee assignment not found', 404);

    const updates = {};
    if (payload.isOptedIn !== undefined) updates.isOptedIn = Boolean(payload.isOptedIn);
    if (payload.status !== undefined) updates.status = ensureOption(payload.status, ASSIGNMENT_STATUSES, 'Status');
    if (payload.remarks !== undefined) updates.remarks = optionalText(payload.remarks);

    // Calculate discounts
    if (payload.discountType !== undefined || payload.discountValue !== undefined || payload.concessionAmount !== undefined) {
      const discountType = payload.discountType || assignment.discountType;
      const discountValue = payload.discountValue !== undefined ? Number(payload.discountValue) : assignment.discountValue;
      const concessionAmount = payload.concessionAmount !== undefined ? Number(payload.concessionAmount) : assignment.concessionAmount;
      const originalAmount = assignment.originalAmount;

      let discountAmount = 0;
      if (discountType === 'PERCENTAGE') {
        discountAmount = (originalAmount * discountValue) / 100;
      } else if (discountType === 'FIXED') {
        discountAmount = discountValue;
      }

      const totalDeduction = discountAmount + concessionAmount;
      const finalAmount = Math.max(0, originalAmount - totalDeduction);

      updates.discountType = discountType;
      updates.discountValue = discountValue;
      updates.discountAmount = discountAmount;
      updates.concessionAmount = concessionAmount;
      updates.finalAmount = finalAmount;
    }

    const updated = await feeRepository.updateAssignment(schoolId, id, updates);
    return updated.toPublicJSON();
  }

  // ==========================================
  // INVOICES & PAYMENTS
  // ==========================================
  async listInvoices(schoolId, query = {}) {
    const result = await feeRepository.listInvoices(schoolId, query);
    return {
      data: result.items.map((item) => item.toPublicJSON()),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async getInvoice(schoolId, id) {
    const invoice = await feeRepository.findInvoiceById(schoolId, id);
    if (!invoice) throw new AppError('Fee invoice not found', 404);
    return invoice.toPublicJSON();
  }

  async generateInvoice(schoolId, payload = {}) {
    const studentId = requireText(payload.studentId, 'Student');
    const enrollmentId = requireText(payload.enrollmentId, 'Enrollment');
    const academicYearId = requireText(payload.academicYearId, 'Academic Year');
    const periodLabel = requireText(payload.periodLabel, 'Period Label');
    const dueDate = payload.dueDate ? new Date(payload.dueDate) : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    const assignments = await feeRepository.listAssignmentsByEnrollment(schoolId, enrollmentId);
    const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE' && a.isOptedIn);

    if (activeAssignments.length === 0) {
      throw new AppError('No active fee assignments found for this student', 400);
    }

    const items = activeAssignments.map((a) => ({
      feeAssignmentId: a._id,
      feeHeadName: a.feeHeadName,
      originalAmount: a.originalAmount,
      discountAmount: a.discountAmount + a.concessionAmount,
      finalAmount: a.finalAmount,
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.finalAmount, 0);
    const invoiceNumber = await feeRepository.getNextInvoiceNumber(schoolId);

    const created = await feeRepository.createInvoice({
      schoolId,
      studentId,
      enrollmentId,
      academicYearId,
      invoiceNumber,
      periodLabel,
      periodStart: payload.periodStart ? new Date(payload.periodStart) : new Date(),
      periodEnd: payload.periodEnd ? new Date(payload.periodEnd) : new Date(),
      dueDate,
      items,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: 'PENDING',
    });

    return created.toPublicJSON();
  }

  async payInvoice(schoolId, invoiceId, payload = {}, collectedBy = '') {
    const invoice = await feeRepository.findInvoiceById(schoolId, invoiceId);
    if (!invoice) throw new AppError('Fee invoice not found', 404);

    if (invoice.status === 'PAID') {
      throw new AppError('This invoice has already been fully paid', 400);
    }

    const amount = ensureNumber(payload.amount, 'Payment Amount', 1);
    if (amount > invoice.balanceAmount) {
      throw new AppError(`Payment amount (₹${amount}) exceeds remaining balance (₹${invoice.balanceAmount})`, 400);
    }

    const paymentMethod = payload.paymentMethod ? ensureOption(payload.paymentMethod, FEE_PAYMENT_METHODS, 'Payment Method') : 'UPI';
    const receiptNumber = await feeRepository.getNextReceiptNumber(schoolId);

    const payment = await feeRepository.createPayment({
      schoolId,
      invoiceId,
      studentId: invoice.studentId._id || invoice.studentId,
      receiptNumber,
      amount,
      paymentMethod,
      paymentReference: optionalText(payload.paymentReference),
      paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
      remarks: optionalText(payload.remarks),
      collectedBy: collectedBy || optionalText(payload.collectedBy),
      status: 'COMPLETED',
    });

    const newPaidAmount = invoice.paidAmount + amount;
    const newBalanceAmount = invoice.totalAmount - newPaidAmount;
    const newStatus = newBalanceAmount <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    await feeRepository.updateInvoice(schoolId, invoiceId, {
      paidAmount: newPaidAmount,
      balanceAmount: newBalanceAmount,
      status: newStatus,
    });

    return payment.toPublicJSON();
  }

  async listPayments(schoolId, query = {}) {
    const result = await feeRepository.listPayments(schoolId, query);
    return {
      data: result.items.map((item) => item.toPublicJSON()),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async getPayment(schoolId, id) {
    const payment = await feeRepository.findPaymentById(schoolId, id);
    if (!payment) throw new AppError('Payment record not found', 404);
    return payment.toPublicJSON();
  }
}

export const feeService = new FeeService();
