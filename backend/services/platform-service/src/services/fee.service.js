import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { feeRepository } from '../repositories/fee.repository.js';

const FEE_ERR = {
  VALIDATION_ERROR: 'FEE_VALIDATION_ERROR',
  NOT_FOUND: 'FEE_NOT_FOUND',
  DUPLICATE: 'FEE_DUPLICATE',
};

function bad(message, code = FEE_ERR.VALIDATION_ERROR) {
  return new AppError(message, 400, code);
}

function notFound(what) {
  return new AppError(, 404, FEE_ERR.NOT_FOUND);
}

function requireSchool(schoolId) {
  if (!schoolId || !mongoose.isValidObjectId(String(schoolId))) {
    throw new AppError('School context is missing', 401, FEE_ERR.VALIDATION_ERROR);
  }
  return String(schoolId);
}

function requireText(value, label, { max = 100 } = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw bad();
  if (text.length > max) throw bad();
  return text;
}

function requireId(value, label) {
  const raw = String(value ?? '').trim();
  if (!raw || !mongoose.isValidObjectId(raw)) throw bad();
  return raw;
}

export const feeService = {
  async listFeeHeads(schoolIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    return (await feeRepository.listFeeHeads(schoolId)).map(h => h.toPublicJSON());
  },

  async createFeeHead(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const name = requireText(data.name, 'Fee head name');
    const code = requireText(data.code, 'Code', { max: 20 }).toUpperCase();
    
    const head = await feeRepository.createFeeHead({
      schoolId,
      name,
      code,
      description: data.description || '',
      status: 'ACTIVE',
    });
    return head.toPublicJSON();
  },

  async listFeeStructures(schoolIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    return (await feeRepository.listFeeStructures(schoolId)).map(s => s.toPublicJSON());
  },

  async createFeeStructure(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const academicYearId = requireId(data.academicYearId, 'Academic Year');
    const classId = requireId(data.classId, 'Class');
    const items = Array.isArray(data.items) ? data.items : [];
    
    if (items.length === 0) throw bad('At least one fee item is required');
    
    let totalAmount = 0;
    const processedItems = [];
    
    for (const item of items) {
      const feeHeadId = requireId(item.feeHeadId, 'Fee Head');
      const amount = Number(item.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw bad('Amount must be positive');
      
      processedItems.push({ feeHeadId, amount, frequency: item.frequency || 'YEARLY' });
      totalAmount += amount;
    }
    
    const struct = await feeRepository.createFeeStructure({
      schoolId,
      academicYearId,
      classId,
      items: processedItems,
      totalAmount,
      status: 'ACTIVE',
    });
    return struct.toPublicJSON();
  },

  async listStudentFeeAssignments(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    return (await feeRepository.listStudentFeeAssignments(schoolId, query)).map(a => a.toPublicJSON());
  },

  async createStudentFeeAssignment(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(data.studentId, 'Student');
    const academicYearId = requireId(data.academicYearId, 'Academic Year');
    const classId = requireId(data.classId, 'Class');
    
    const struct = await feeRepository.findFeeStructureByYearAndClass(schoolId, academicYearId, classId);
    if (!struct) throw notFound('Fee Structure for this class and year');
    
    const { StudentFeeAssignment } = await import('../models/StudentFeeAssignment.js');
    const assign = await StudentFeeAssignment.create({
      schoolId,
      studentId,
      academicYearId,
      classId,
      feeStructureId: struct._id,
      totalAmount: struct.totalAmount,
      discountAmount: 0,
      paidAmount: 0,
      status: 'PENDING',
    });
    return assign.toPublicJSON();
  },

  async getFeeDues(schoolIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const assignments = await feeRepository.listStudentFeeAssignments(schoolId);
    return assignments.filter(a => a.getDueAmount() > 0).map(a => a.toPublicJSON());
  },
};