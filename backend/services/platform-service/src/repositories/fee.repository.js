import mongoose from 'mongoose';
import { FeeHead } from '../models/FeeHead.js';
import { FeeStructure } from '../models/FeeStructure.js';
import { FeeStructureItem } from '../models/FeeStructureItem.js';
import { StudentFeeAssignment } from '../models/StudentFeeAssignment.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { FeePayment } from '../models/FeePayment.js';
import { escapeRegex } from '../../../shared/sanitize.js';

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

export class FeeRepository {
  // ===================== FEE HEADS =====================
  listHeads(schoolId, { search, category, status, page = 1, limit = 50 } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { code: { $regex: safe, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (status) query.status = status;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      FeeHead.find(query).sort({ name: 1 }).skip(skip).limit(safeLimit),
      FeeHead.countDocuments(query),
    ]).then(([items, total]) => ({ items, total, page: safePage, limit: safeLimit }));
  }

  findHeadById(schoolId, id) {
    return FeeHead.findOne({ _id: id, schoolId: toObjectId(schoolId) });
  }

  findHeadByNameOrCode(schoolId, name, code, excludeId = null) {
    const conditions = [];
    if (name) conditions.push({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (code) conditions.push({ code: code.trim().toUpperCase() });
    const query = { schoolId: toObjectId(schoolId), $or: conditions };
    if (excludeId) query._id = { $ne: excludeId };
    return FeeHead.findOne(query);
  }

  createHead(payload) {
    return FeeHead.create(payload);
  }

  updateHead(schoolId, id, payload) {
    return FeeHead.findOneAndUpdate({ _id: id, schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  deleteHead(schoolId, id) {
    return FeeHead.findOneAndDelete({ _id: id, schoolId: toObjectId(schoolId) });
  }

  // ===================== FEE STRUCTURES =====================
  listStructures(schoolId, { academicYearId, classId, status, page = 1, limit = 50 } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (academicYearId) query.academicYearId = toObjectId(academicYearId);
    if (classId) query.classId = toObjectId(classId);
    if (status) query.status = status;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      FeeStructure.find(query)
        .populate('academicYearId', 'name code isCurrent')
        .populate('classId', 'name code numericOrder')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      FeeStructure.countDocuments(query),
    ]).then(([items, total]) => ({ items, total, page: safePage, limit: safeLimit }));
  }

  findStructureById(schoolId, id) {
    return FeeStructure.findOne({ _id: id, schoolId: toObjectId(schoolId) })
      .populate('academicYearId', 'name code isCurrent')
      .populate('classId', 'name code numericOrder');
  }

  findStructureByClassAndYear(schoolId, classId, academicYearId, excludeId = null) {
    const query = {
      schoolId: toObjectId(schoolId),
      classId: toObjectId(classId),
      academicYearId: toObjectId(academicYearId),
    };
    if (excludeId) query._id = { $ne: excludeId };
    return FeeStructure.findOne(query);
  }

  createStructure(payload) {
    return FeeStructure.create(payload);
  }

  updateStructure(schoolId, id, payload) {
    return FeeStructure.findOneAndUpdate({ _id: id, schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  deleteStructure(schoolId, id) {
    return FeeStructure.findOneAndDelete({ _id: id, schoolId: toObjectId(schoolId) });
  }

  // ===================== FEE STRUCTURE ITEMS =====================
  listStructureItems(schoolId, feeStructureId) {
    return FeeStructureItem.find({
      schoolId: toObjectId(schoolId),
      feeStructureId: toObjectId(feeStructureId),
    })
      .populate('feeHeadId', 'name code category status')
      .sort({ createdAt: 1 });
  }

  findStructureItemById(schoolId, id) {
    return FeeStructureItem.findOne({ _id: id, schoolId: toObjectId(schoolId) })
      .populate('feeHeadId', 'name code category status');
  }

  findStructureItemByHead(feeStructureId, feeHeadId, excludeId = null) {
    const query = {
      feeStructureId: toObjectId(feeStructureId),
      feeHeadId: toObjectId(feeHeadId),
    };
    if (excludeId) query._id = { $ne: excludeId };
    return FeeStructureItem.findOne(query);
  }

  createStructureItem(payload) {
    return FeeStructureItem.create(payload);
  }

  updateStructureItem(schoolId, id, payload) {
    return FeeStructureItem.findOneAndUpdate({ _id: id, schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  deleteStructureItem(schoolId, id) {
    return FeeStructureItem.findOneAndDelete({ _id: id, schoolId: toObjectId(schoolId) });
  }

  deleteStructureItemsByStructure(schoolId, feeStructureId) {
    return FeeStructureItem.deleteMany({
      schoolId: toObjectId(schoolId),
      feeStructureId: toObjectId(feeStructureId),
    });
  }

  countStructureItems(feeStructureId) {
    return FeeStructureItem.countDocuments({ feeStructureId: toObjectId(feeStructureId) });
  }

  // ===================== STUDENT FEE ASSIGNMENTS =====================
  listAssignmentsByStudent(schoolId, studentId) {
    return StudentFeeAssignment.find({
      schoolId: toObjectId(schoolId),
      studentId: toObjectId(studentId),
    })
      .populate('feeHeadId', 'name code category')
      .populate('feeStructureId', 'name')
      .sort({ createdAt: 1 });
  }

  listAssignmentsByEnrollment(schoolId, enrollmentId) {
    return StudentFeeAssignment.find({
      schoolId: toObjectId(schoolId),
      enrollmentId: toObjectId(enrollmentId),
    })
      .populate('feeHeadId', 'name code category')
      .sort({ createdAt: 1 });
  }

  findAssignmentById(schoolId, id) {
    return StudentFeeAssignment.findOne({ _id: id, schoolId: toObjectId(schoolId) });
  }

  createAssignment(payload) {
    return StudentFeeAssignment.create(payload);
  }

  createAssignmentsBulk(payloadArray) {
    return StudentFeeAssignment.insertMany(payloadArray);
  }

  updateAssignment(schoolId, id, payload) {
    return StudentFeeAssignment.findOneAndUpdate({ _id: id, schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  deleteAssignment(schoolId, id) {
    return StudentFeeAssignment.findOneAndDelete({ _id: id, schoolId: toObjectId(schoolId) });
  }

  // ===================== INVOICES =====================
  listInvoices(schoolId, { studentId, academicYearId, status, search, page = 1, limit = 20 } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (studentId) query.studentId = toObjectId(studentId);
    if (academicYearId) query.academicYearId = toObjectId(academicYearId);
    if (status) query.status = status;
    if (search) {
      query.invoiceNumber = { $regex: search, $options: 'i' };
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      FeeInvoice.find(query)
        .populate('studentId', 'firstName lastName admissionNumber parentName parentPhone')
        .populate('academicYearId', 'name code')
        .sort({ dueDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      FeeInvoice.countDocuments(query),
    ]).then(([items, total]) => ({ items, total, page: safePage, limit: safeLimit }));
  }

  findInvoiceById(schoolId, id) {
    return FeeInvoice.findOne({ _id: id, schoolId: toObjectId(schoolId) })
      .populate('studentId', 'firstName lastName admissionNumber parentName parentPhone address')
      .populate('academicYearId', 'name code');
  }

  createInvoice(payload) {
    return FeeInvoice.create(payload);
  }

  updateInvoice(schoolId, id, payload) {
    return FeeInvoice.findOneAndUpdate({ _id: id, schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  async getNextInvoiceNumber(schoolId) {
    const year = new Date().getFullYear();
    const count = await FeeInvoice.countDocuments({ schoolId: toObjectId(schoolId) });
    return `INV-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // ===================== PAYMENTS =====================
  listPayments(schoolId, { invoiceId, studentId, page = 1, limit = 20 } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (invoiceId) query.invoiceId = toObjectId(invoiceId);
    if (studentId) query.studentId = toObjectId(studentId);

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      FeePayment.find(query)
        .populate('studentId', 'firstName lastName admissionNumber')
        .populate('invoiceId', 'invoiceNumber periodLabel totalAmount')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(safeLimit),
      FeePayment.countDocuments(query),
    ]).then(([items, total]) => ({ items, total, page: safePage, limit: safeLimit }));
  }

  findPaymentById(schoolId, id) {
    return FeePayment.findOne({ _id: id, schoolId: toObjectId(schoolId) })
      .populate('studentId', 'firstName lastName admissionNumber parentName')
      .populate('invoiceId', 'invoiceNumber periodLabel totalAmount paidAmount balanceAmount');
  }

  createPayment(payload) {
    return FeePayment.create(payload);
  }

  async getNextReceiptNumber(schoolId) {
    const year = new Date().getFullYear();
    const count = await FeePayment.countDocuments({ schoolId: toObjectId(schoolId) });
    return `REC-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}

export const feeRepository = new FeeRepository();
