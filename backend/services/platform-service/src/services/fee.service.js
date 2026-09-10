import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { feeRepository } from '../repositories/fee.repository.js';
import { FeeStructureItem, FEE_FREQUENCIES } from '../models/FeeStructureItem.js';
import { FEE_HEAD_STATUSES, FEE_CATEGORIES } from '../models/FeeHead.js';
import { FEE_STRUCTURE_STATUSES } from '../models/FeeStructure.js';
import { ASSIGNMENT_STATUSES, DISCOUNT_TYPES } from '../models/StudentFeeAssignment.js';
import { FEE_PAYMENT_METHODS } from '../models/FeePayment.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';

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

function requireSchool(schoolId) {
  if (!schoolId || !mongoose.isValidObjectId(String(schoolId))) {
    throw new AppError('School context is missing or invalid', 401);
  }
  return String(schoolId);
}

function requireText(value, label, { max = 150 } = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  if (text.length > max) throw new AppError(`${label} must be ${max} characters or fewer`, 400);
  return text;
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function requireId(value, label) {
  const raw = String(value ?? '').trim();
  if (!raw || !mongoose.isValidObjectId(raw)) throw new AppError(`${label} is required and must be a valid ID`, 400);
  return raw;
}

function ensureOption(value, options, label) {
  const text = requireText(value, label);
  if (!options.includes(text)) throw new AppError(`${label} is invalid`, 400);
  return text;
}

function ensureNumber(value, label, min = 0) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < min) throw new AppError(`${label} must be a valid number >= ${min}`, 400);
  return num;
}

export class FeeService {
  /* ==========================================
     FEE HEADS
     ========================================== */
  async listHeads(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
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

  async listFeeHeads(schoolIdRaw, query = {}) {
    const res = await this.listHeads(schoolIdRaw, query);
    return res.data;
  }

  async getHead(schoolIdRaw, idRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Fee Head ID');
    const head = await feeRepository.findHeadById(schoolId, id);
    if (!head) throw new AppError('Fee head not found', 404);
    return head.toPublicJSON();
  }

  async createHead(schoolIdRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const name = requireText(payload.name, 'Fee Head Name');
    const code = requireText(payload.code, 'Fee Head Code', { max: 20 }).toUpperCase();
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

  async createFeeHead(schoolIdRaw, payload = {}) {
    return this.createHead(schoolIdRaw, payload);
  }

  async updateHead(schoolIdRaw, idRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Fee Head ID');
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
      const code = requireText(payload.code, 'Fee Head Code', { max: 20 }).toUpperCase();
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

  async deleteHead(schoolIdRaw, idRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Fee Head ID');
    const head = await feeRepository.findHeadById(schoolId, id);
    if (!head) throw new AppError('Fee head not found', 404);

    const linkedItemsCount = await FeeStructureItem.countDocuments({
      schoolId,
      feeHeadId: id,
    });
    if (linkedItemsCount > 0) {
      throw new AppError('Cannot delete fee head: it is attached to active fee structures', 400);
    }

    await feeRepository.deleteHead(schoolId, id);
    return { success: true, message: 'Fee head deleted successfully' };
  }

  async seedDefaultHeads(schoolIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    let createdCount = 0;
    for (const head of DEFAULT_FEE_HEADS) {
      const existing = await feeRepository.findHeadByNameOrCode(schoolId, head.name, head.code);
      if (!existing) {
        await feeRepository.createHead({ schoolId, ...head, status: 'ACTIVE' });
        createdCount++;
      }
    }
    return { createdCount, message: `Seeded ${createdCount} default fee heads` };
  }

  async bulkCreateHeads(schoolIdRaw, { heads } = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    if (!Array.isArray(heads) || heads.length === 0) {
      throw new AppError('No fee heads provided for import', 400);
    }

    let createdCount = 0;
    const errors = [];

    for (const h of heads) {
      if (!h.name || !h.code) continue;
      try {
        const name = String(h.name).trim();
        const code = String(h.code).trim().toUpperCase();
        const existing = await feeRepository.findHeadByNameOrCode(schoolId, name, code);
        if (!existing) {
          await feeRepository.createHead({
            schoolId,
            name,
            code,
            category: h.category && FEE_CATEGORIES.includes(h.category) ? h.category : 'ACADEMIC',
            description: h.description ? String(h.description).trim() : '',
            status: h.status && FEE_HEAD_STATUSES.includes(h.status) ? h.status : 'ACTIVE',
          });
          createdCount++;
        }
      } catch (err) {
        errors.push(`${h.name}: ${err.message}`);
      }
    }

    return {
      createdCount,
      errors,
      message: `Imported ${createdCount} fee heads successfully`,
    };
  }

  /* ==========================================
     FEE STRUCTURES
     ========================================== */
  async listStructures(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const result = await feeRepository.listStructures(schoolId, query);

    // ZERO N+1 queries: fetch all items for returned structures in a single batch query
    const structureIds = result.items.map((s) => s._id);
    const allItems = structureIds.length > 0
      ? await FeeStructureItem.find({
          schoolId,
          feeStructureId: { $in: structureIds },
        }).populate('feeHeadId', 'name code category')
      : [];

    const itemsByStructure = new Map();
    for (const item of allItems) {
      const sid = String(item.feeStructureId);
      if (!itemsByStructure.has(sid)) itemsByStructure.set(sid, []);
      itemsByStructure.get(sid).push(item);
    }

    const data = result.items.map((structure) => {
      const items = itemsByStructure.get(String(structure._id)) || [];
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
      json.itemsCount = items.length;
      json.totalAmount = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
      return json;
    });

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

  async listFeeStructures(schoolIdRaw, query = {}) {
    const res = await this.listStructures(schoolIdRaw, query);
    return res.data;
  }

  async getStructure(schoolIdRaw, idRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Fee Structure ID');
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

  async getFeeStructure(schoolIdRaw, idRaw) {
    return this.getStructure(schoolIdRaw, idRaw);
  }

  async createStructure(schoolIdRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const classId = requireId(payload.classId, 'Target Class');
    const academicYearId = requireId(payload.academicYearId, 'Academic Year');
    const name = requireText(payload.name, 'Structure Name');
    const description = optionalText(payload.description);
    const status = payload.status ? ensureOption(payload.status, FEE_STRUCTURE_STATUSES, 'Status') : 'ACTIVE';

    const existing = await feeRepository.findStructureByClassAndYear(schoolId, classId, academicYearId);
    if (existing) {
      throw new AppError('A fee structure already exists for this class in this academic year', 409);
    }

    const created = await feeRepository.createStructure({
      schoolId,
      classId,
      academicYearId,
      name,
      description,
      status,
      totalAmount: 0,
    });

    // If initial items array is passed, create the structure items
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      let sum = 0;
      for (const item of payload.items) {
        if (!item.feeHeadId || !item.amount) continue;
        const amt = Number(item.amount);
        await feeRepository.createStructureItem({
          schoolId,
          feeStructureId: created._id,
          feeHeadId: item.feeHeadId,
          amount: amt,
          frequency: item.frequency || 'MONTHLY',
          dueDay: item.dueDay || 10,
          isOptional: Boolean(item.isOptional),
        });
        sum += amt;
      }
      await feeRepository.updateStructure(schoolId, created._id, { totalAmount: sum });
    }

    return created.toPublicJSON();
  }

  async createFeeStructure(schoolIdRaw, payload = {}) {
    return this.createStructure(schoolIdRaw, payload);
  }

  async updateStructure(schoolIdRaw, idRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Fee Structure ID');
    const structure = await feeRepository.findStructureById(schoolId, id);
    if (!structure) throw new AppError('Fee structure not found', 404);

    const updates = {};
    if (payload.name !== undefined) updates.name = requireText(payload.name, 'Structure Name');
    if (payload.description !== undefined) updates.description = optionalText(payload.description);
    if (payload.status !== undefined) updates.status = ensureOption(payload.status, FEE_STRUCTURE_STATUSES, 'Status');

    const updated = await feeRepository.updateStructure(schoolId, id, updates);
    return updated.toPublicJSON();
  }

  async deleteStructure(schoolIdRaw, idRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Fee Structure ID');
    const structure = await feeRepository.findStructureById(schoolId, id);
    if (!structure) throw new AppError('Fee structure not found', 404);

    await Promise.all([
      feeRepository.deleteStructure(schoolId, id),
      feeRepository.deleteStructureItemsByStructure(schoolId, id),
    ]);

    return { success: true, message: 'Fee structure and its line items deleted successfully' };
  }

  /* ==========================================
     FEE STRUCTURE ITEMS
     ========================================== */
  async listStructureItems(schoolIdRaw, structureIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const structureId = requireId(structureIdRaw, 'Fee Structure ID');
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

  async addStructureItem(schoolIdRaw, structureIdRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const structureId = requireId(structureIdRaw, 'Fee Structure ID');
    const structure = await feeRepository.findStructureById(schoolId, structureId);
    if (!structure) throw new AppError('Fee structure not found', 404);

    const feeHeadId = requireId(payload.feeHeadId, 'Fee Head');
    const amount = ensureNumber(payload.amount, 'Amount', 0);
    const frequency = payload.frequency ? ensureOption(payload.frequency, FEE_FREQUENCIES, 'Frequency') : 'MONTHLY';
    const dueDay = payload.dueDay !== undefined ? ensureNumber(payload.dueDay, 'Due Day', 1) : 10;
    const isOptional = Boolean(payload.isOptional);

    const existingItem = await feeRepository.findStructureItemByHead(schoolId, structureId, feeHeadId);
    if (existingItem) {
      throw new AppError('This fee head is already attached to this structure. Edit the existing item instead.', 409);
    }

    const item = await feeRepository.createStructureItem({
      schoolId,
      feeStructureId: structureId,
      feeHeadId,
      amount,
      frequency,
      dueDay,
      isOptional,
    });

    // Update structure totalAmount
    const allItems = await feeRepository.listStructureItems(schoolId, structureId);
    const totalAmount = allItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    await feeRepository.updateStructure(schoolId, structureId, { totalAmount });

    const populated = await feeRepository.findStructureItemById(schoolId, item._id);
    const json = populated.toPublicJSON();
    json.feeHead = populated.feeHeadId ? {
      id: populated.feeHeadId._id?.toString() || populated.feeHeadId.toString(),
      name: populated.feeHeadId.name,
      code: populated.feeHeadId.code,
      category: populated.feeHeadId.category,
    } : null;
    return json;
  }

  async updateStructureItem(schoolIdRaw, idRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Structure Item ID');
    const item = await feeRepository.findStructureItemById(schoolId, id);
    if (!item) throw new AppError('Fee structure line item not found', 404);

    const updates = {};
    if (payload.amount !== undefined) updates.amount = ensureNumber(payload.amount, 'Amount', 0);
    if (payload.frequency !== undefined) updates.frequency = ensureOption(payload.frequency, FEE_FREQUENCIES, 'Frequency');
    if (payload.dueDay !== undefined) updates.dueDay = ensureNumber(payload.dueDay, 'Due Day', 1);
    if (payload.isOptional !== undefined) updates.isOptional = Boolean(payload.isOptional);

    const updated = await feeRepository.updateStructureItem(schoolId, id, updates);

    // Update parent structure total
    const allItems = await feeRepository.listStructureItems(schoolId, item.feeStructureId);
    const totalAmount = allItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    await feeRepository.updateStructure(schoolId, item.feeStructureId, { totalAmount });

    const json = updated.toPublicJSON();
    json.feeHead = updated.feeHeadId ? {
      id: updated.feeHeadId._id?.toString() || updated.feeHeadId.toString(),
      name: updated.feeHeadId.name,
      code: updated.feeHeadId.code,
      category: updated.feeHeadId.category,
    } : null;
    return json;
  }

  async deleteStructureItem(schoolIdRaw, idRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Structure Item ID');
    const item = await feeRepository.findStructureItemById(schoolId, id);
    if (!item) throw new AppError('Fee structure line item not found', 404);

    const structureId = item.feeStructureId;
    await feeRepository.deleteStructureItem(schoolId, id);

    // Update parent structure total
    const allItems = await feeRepository.listStructureItems(schoolId, structureId);
    const totalAmount = allItems.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    await feeRepository.updateStructure(schoolId, structureId, { totalAmount });

    return { success: true, message: 'Fee line item removed from structure' };
  }

  /* ==========================================
     STUDENT FEE ASSIGNMENTS
     ========================================== */
  async listStudentAssignments(schoolIdRaw, studentIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(studentIdRaw, 'Student ID');
    const assignments = await feeRepository.listAssignmentsByStudent(schoolId, studentId);
    return assignments.map((a) => a.toPublicJSON());
  }

  async listStudentFeeAssignments(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const assignments = await feeRepository.listAssignments(schoolId, query);
    return assignments.map((a) => a.toPublicJSON());
  }

  async createStudentFeeAssignment(schoolIdRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(payload.studentId, 'Student');
    const academicYearId = requireId(payload.academicYearId, 'Academic Year');
    const classId = requireId(payload.classId, 'Class');

    const structure = await feeRepository.findStructureByClassAndYear(schoolId, classId, academicYearId);
    if (!structure) throw new AppError('Fee structure not found for this class and academic year', 404);

    const assignment = await feeRepository.createAssignment({
      schoolId,
      studentId,
      academicYearId,
      classId,
      feeStructureId: structure._id,
      totalAmount: structure.totalAmount || 0,
      discountAmount: 0,
      paidAmount: 0,
      status: 'PENDING',
    });

    return assignment.toPublicJSON();
  }

  async autoAssignStudentFees(schoolIdRaw, studentIdRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(studentIdRaw, 'Student ID');
    const enrollmentId = requireId(payload.enrollmentId, 'Enrollment ID');
    const classId = requireId(payload.classId, 'Class ID');
    const academicYearId = requireId(payload.academicYearId, 'Academic Year ID');
    const optionalFeeHeadIds = Array.isArray(payload.optionalFeeHeadIds) ? payload.optionalFeeHeadIds : [];

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
      const isOptional = item.isOptional;
      const headIdStr = item.feeHeadId?._id?.toString() || item.feeHeadId?.toString() || '';
      const isOptedIn = !isOptional || optionalFeeHeadIds.includes(headIdStr);

      const assignmentData = {
        schoolId,
        studentId,
        enrollmentId,
        feeStructureId: structure._id,
        feeStructureItemId: item._id,
        feeHeadId: item.feeHeadId?._id || item.feeHeadId,
        feeHeadName: item.feeHeadId?.name || 'Fee',
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
        await feeRepository.createAssignment(assignmentData);
        assignedCount++;
      } catch {
        // Skip duplicate assignment
      }
    }

    return { assignedCount, message: `Successfully assigned ${assignedCount} fee components to student` };
  }

  async updateStudentAssignment(schoolIdRaw, idRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Assignment ID');
    const assignment = await feeRepository.findAssignmentById(schoolId, id);
    if (!assignment) throw new AppError('Fee assignment not found', 404);

    const updates = {};
    if (payload.isOptedIn !== undefined) updates.isOptedIn = Boolean(payload.isOptedIn);
    if (payload.status !== undefined) updates.status = ensureOption(payload.status, ASSIGNMENT_STATUSES, 'Status');
    if (payload.remarks !== undefined) updates.remarks = optionalText(payload.remarks);

    if (payload.discountType !== undefined || payload.discountValue !== undefined || payload.concessionAmount !== undefined) {
      const discountType = payload.discountType || assignment.discountType;
      const discountValue = payload.discountValue !== undefined ? Number(payload.discountValue) : assignment.discountValue;
      const concessionAmount = payload.concessionAmount !== undefined ? Number(payload.concessionAmount) : assignment.concessionAmount;
      const originalAmount = assignment.originalAmount || 0;

      let discountAmount = 0;
      if (discountType === 'PERCENTAGE') {
        discountAmount = Math.round((originalAmount * discountValue) / 100);
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

  async getFeeDues(schoolIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const assignments = await feeRepository.listAssignments(schoolId);
    return assignments.filter((a) => (typeof a.getDueAmount === 'function' ? a.getDueAmount() > 0 : false)).map((a) => a.toPublicJSON());
  }

  /* ==========================================
     INVOICES & PAYMENTS
     ========================================== */
  async listInvoices(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
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

  async getInvoice(schoolIdRaw, idRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Invoice ID');
    const invoice = await feeRepository.findInvoiceById(schoolId, id);
    if (!invoice) throw new AppError('Fee invoice not found', 404);
    return invoice.toPublicJSON();
  }

  async generateInvoice(schoolIdRaw, payload = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(payload.studentId, 'Student');
    const periodLabel = requireText(payload.periodLabel || 'Tuition & Fees', 'Period Label');
    const dueDate = payload.dueDate ? new Date(payload.dueDate) : new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

    // Resolve enrollment & academic year if omitted
    let enrollmentId = payload.enrollmentId;
    let academicYearId = payload.academicYearId;

    if (!enrollmentId || !academicYearId) {
      const enrollment = await StudentEnrollment.findOne({
        schoolId,
        studentId,
        status: 'ACTIVE',
      }).sort({ createdAt: -1 });

      if (enrollment) {
        enrollmentId = enrollmentId || enrollment._id;
        academicYearId = academicYearId || enrollment.academicYearId;
      }
    }

    if (!enrollmentId || !academicYearId) {
      throw new AppError('No active enrollment found for this student to generate an invoice against', 400);
    }

    const assignments = await feeRepository.listAssignmentsByEnrollment(schoolId, enrollmentId);
    const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE' && a.isOptedIn);

    if (activeAssignments.length === 0) {
      throw new AppError('No active fee components assigned to this student', 400);
    }

    const items = activeAssignments.map((a) => ({
      feeAssignmentId: a._id,
      feeHeadName: a.feeHeadName || 'Fee Item',
      originalAmount: a.originalAmount || a.totalAmount || 0,
      discountAmount: (a.discountAmount || 0) + (a.concessionAmount || 0),
      finalAmount: a.finalAmount !== undefined ? a.finalAmount : ((a.originalAmount || 0) - (a.discountAmount || 0)),
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

    const populated = await feeRepository.findInvoiceById(schoolId, created._id);
    return populated.toPublicJSON();
  }

  async payInvoice(schoolIdRaw, invoiceIdRaw, payload = {}, collectedBy = '') {
    const schoolId = requireSchool(schoolIdRaw);
    const invoiceId = requireId(invoiceIdRaw, 'Invoice ID');
    const invoice = await feeRepository.findInvoiceById(schoolId, invoiceId);
    if (!invoice) throw new AppError('Fee invoice not found', 404);

    if (invoice.status === 'PAID') {
      throw new AppError('This invoice has already been paid in full', 400);
    }

    const amount = ensureNumber(payload.amount, 'Payment Amount', 1);
    if (amount > invoice.balanceAmount) {
      throw new AppError(`Payment amount (₹${amount}) exceeds invoice remaining balance (₹${invoice.balanceAmount})`, 400);
    }

    const paymentMethod = payload.paymentMethod ? ensureOption(payload.paymentMethod, FEE_PAYMENT_METHODS, 'Payment Method') : 'UPI';
    const receiptNumber = await feeRepository.getNextReceiptNumber(schoolId);

    const payment = await feeRepository.createPayment({
      schoolId,
      invoiceId,
      studentId: invoice.studentId?._id || invoice.studentId,
      receiptNumber,
      amount,
      paymentMethod,
      paymentMode: paymentMethod,
      paymentReference: optionalText(payload.paymentReference),
      referenceNo: optionalText(payload.paymentReference),
      paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
      transactionDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
      remarks: optionalText(payload.remarks),
      notes: optionalText(payload.remarks),
      collectedBy: collectedBy || optionalText(payload.collectedBy) || 'Accounts Office',
      status: 'COMPLETED',
    });

    const newPaidAmount = invoice.paidAmount + amount;
    const newBalanceAmount = Math.max(0, invoice.totalAmount - newPaidAmount);
    const newStatus = newBalanceAmount <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    await feeRepository.updateInvoice(schoolId, invoiceId, {
      paidAmount: newPaidAmount,
      balanceAmount: newBalanceAmount,
      status: newStatus,
    });

    return payment.toPublicJSON();
  }

  async listPayments(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
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

  async getPayment(schoolIdRaw, idRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const id = requireId(idRaw, 'Payment ID');
    const payment = await feeRepository.findPaymentById(schoolId, id);
    if (!payment) throw new AppError('Payment record not found', 404);
    return payment.toPublicJSON();
  }
}

export const feeService = new FeeService();
