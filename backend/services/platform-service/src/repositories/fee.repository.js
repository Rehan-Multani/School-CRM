import mongoose from 'mongoose';
import { FeeHead } from '../models/FeeHead.js';
import { FeeStructure } from '../models/FeeStructure.js';
import { FeeStructureItem } from '../models/FeeStructureItem.js';
import { StudentFeeAssignment } from '../models/StudentFeeAssignment.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { FeePayment } from '../models/FeePayment.js';
import { Discount } from '../models/Discount.js';
import { Receipt } from '../models/Receipt.js';
import { FinanceCategory } from '../models/FinanceCategory.js';
import { FinanceTransaction } from '../models/FinanceTransaction.js';
import '../models/AcademicYear.js';
import '../models/SchoolClass.js';
import '../models/Student.js';
import '../models/StudentEnrollment.js';
import { escapeRegex } from '../../../shared/sanitize.js';

function toObjectId(id) {
  if (!id) return null;
  return mongoose.isValidObjectId(String(id)) ? new mongoose.Types.ObjectId(String(id)) : id;
}

/**
 * Fee module repository layer with tenant isolation and sanitized queries.
 */
export class FeeRepository {
  /* ======================== FEE HEADS ======================== */
  listHeads(schoolId, { search, category, status, page = 1, limit = 50 } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { code: { $regex: safe, $options: 'i' } },
      ];
    }
    if (category && category !== 'ALL') query.category = category;
    if (status && status !== 'ALL') query.status = status;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      FeeHead.find(query).sort({ name: 1 }).skip(skip).limit(safeLimit),
      FeeHead.countDocuments(query),
    ]).then(([items, total]) => ({ items, total, page: safePage, limit: safeLimit }));
  }

  listFeeHeads(schoolId, filter = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (filter.search) {
      const safe = escapeRegex(filter.search);
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { code: { $regex: safe, $options: 'i' } },
      ];
    }
    if (filter.category && filter.category !== 'ALL') query.category = filter.category;
    if (filter.status && filter.status !== 'ALL') query.status = filter.status;
    return FeeHead.find(query).sort({ name: 1 });
  }

  findHeadById(schoolId, id) {
    return FeeHead.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) });
  }

  getFeeHead(schoolId, id) {
    return this.findHeadById(schoolId, id);
  }

  findHeadByNameOrCode(schoolId, name, code, excludeId = null) {
    const conditions = [];
    if (name) conditions.push({ name: { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' } });
    if (code) conditions.push({ code: code.trim().toUpperCase() });
    if (conditions.length === 0) return null;
    const query = { schoolId: toObjectId(schoolId), $or: conditions };
    if (excludeId) query._id = { $ne: toObjectId(excludeId) };
    return FeeHead.findOne(query);
  }

  findFeeHeadByCode(schoolId, code) {
    return FeeHead.findOne({ schoolId: toObjectId(schoolId), code: code.trim().toUpperCase() });
  }

  findFeeHeadByName(schoolId, name) {
    return FeeHead.findOne({ schoolId: toObjectId(schoolId), name: { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' } });
  }

  createHead(payload) {
    return FeeHead.create(payload);
  }

  createFeeHead(payload) {
    return FeeHead.create(payload);
  }

  updateHead(schoolId, id, payload) {
    return FeeHead.findOneAndUpdate({ _id: toObjectId(id), schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  updateFeeHead(schoolId, id, updates) {
    return this.updateHead(schoolId, id, updates);
  }

  deleteHead(schoolId, id) {
    return FeeHead.findOneAndDelete({ _id: toObjectId(id), schoolId: toObjectId(schoolId) });
  }

  /* ======================== FEE STRUCTURES ======================== */
  listStructures(schoolId, { academicYearId, classId, status, page = 1, limit = 50 } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (academicYearId) query.academicYearId = toObjectId(academicYearId);
    if (classId) query.classId = toObjectId(classId);
    if (status && status !== 'ALL') query.status = status;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      FeeStructure.find(query)
        .populate('academicYearId', 'name code isCurrent')
        .populate('classId', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      FeeStructure.countDocuments(query),
    ]).then(([items, total]) => ({ items, total, page: safePage, limit: safeLimit }));
  }

  listFeeStructures(schoolId, filter = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (filter.academicYearId) query.academicYearId = toObjectId(filter.academicYearId);
    if (filter.classId) query.classId = toObjectId(filter.classId);
    if (filter.status && filter.status !== 'ALL') query.status = filter.status;
    return FeeStructure.find(query)
      .populate('academicYearId', 'name code isCurrent')
      .populate('classId', 'name code')
      .sort({ createdAt: -1 });
  }

  findStructureById(schoolId, id) {
    return FeeStructure.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) })
      .populate('academicYearId', 'name code isCurrent')
      .populate('classId', 'name code');
  }

  getFeeStructure(schoolId, id) {
    return this.findStructureById(schoolId, id);
  }

  findStructureByClassAndYear(schoolId, classId, academicYearId, excludeId = null) {
    const query = {
      schoolId: toObjectId(schoolId),
      classId: toObjectId(classId),
      academicYearId: toObjectId(academicYearId),
    };
    if (excludeId) query._id = { $ne: toObjectId(excludeId) };
    return FeeStructure.findOne(query);
  }

  findFeeStructureByYearAndClass(schoolId, academicYearId, classId) {
    return this.findStructureByClassAndYear(schoolId, classId, academicYearId);
  }

  createStructure(payload) {
    return FeeStructure.create(payload);
  }

  createFeeStructure(payload) {
    return FeeStructure.create(payload);
  }

  updateStructure(schoolId, id, payload) {
    return FeeStructure.findOneAndUpdate({ _id: toObjectId(id), schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  deleteStructure(schoolId, id) {
    return FeeStructure.findOneAndDelete({ _id: toObjectId(id), schoolId: toObjectId(schoolId) });
  }

  /* ======================== FEE STRUCTURE ITEMS ======================== */
  listStructureItems(schoolId, structureId) {
    return FeeStructureItem.find({
      schoolId: toObjectId(schoolId),
      feeStructureId: toObjectId(structureId),
    })
      .populate('feeHeadId', 'name code category')
      .sort({ createdAt: 1 });
  }

  findStructureItemById(schoolId, id) {
    return FeeStructureItem.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) })
      .populate('feeHeadId', 'name code category');
  }

  findStructureItemByHead(schoolId, structureId, feeHeadId, excludeId = null) {
    const query = {
      schoolId: toObjectId(schoolId),
      feeStructureId: toObjectId(structureId),
      feeHeadId: toObjectId(feeHeadId),
    };
    if (excludeId) query._id = { $ne: toObjectId(excludeId) };
    return FeeStructureItem.findOne(query);
  }

  createStructureItem(payload) {
    return FeeStructureItem.create(payload);
  }

  updateStructureItem(schoolId, id, payload) {
    return FeeStructureItem.findOneAndUpdate({ _id: toObjectId(id), schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    }).populate('feeHeadId', 'name code category');
  }

  deleteStructureItem(schoolId, id) {
    return FeeStructureItem.findOneAndDelete({ _id: toObjectId(id), schoolId: toObjectId(schoolId) });
  }

  deleteStructureItemsByStructure(schoolId, structureId) {
    return FeeStructureItem.deleteMany({
      schoolId: toObjectId(schoolId),
      feeStructureId: toObjectId(structureId),
    });
  }

  /* ======================== STUDENT FEE ASSIGNMENTS ======================== */
  listAssignments(schoolId, query = {}) {
    const filter = { schoolId: toObjectId(schoolId) };
    if (query.studentId) filter.studentId = toObjectId(query.studentId);
    if (query.enrollmentId) filter.enrollmentId = toObjectId(query.enrollmentId);
    if (query.feeStructureId) filter.feeStructureId = toObjectId(query.feeStructureId);
    if (query.status && query.status !== 'ALL') filter.status = query.status;

    return StudentFeeAssignment.find(filter)
      .populate('studentId', 'firstName lastName admissionNumber')
      .populate('academicYearId', 'name code')
      .populate('classId', 'name')
      .populate('feeHeadId', 'name code category')
      .sort({ createdAt: -1 });
  }

  listStudentFeeAssignments(schoolId, filter = {}) {
    return this.listAssignments(schoolId, filter);
  }

  listAssignmentsByEnrollment(schoolId, enrollmentId) {
    return StudentFeeAssignment.find({
      schoolId: toObjectId(schoolId),
      enrollmentId: toObjectId(enrollmentId),
    })
      .populate('feeHeadId', 'name code category')
      .sort({ createdAt: 1 });
  }

  listAssignmentsByStudent(schoolId, studentId) {
    return StudentFeeAssignment.find({
      schoolId: toObjectId(schoolId),
      studentId: toObjectId(studentId),
    })
      .populate('academicYearId', 'name code')
      .populate('classId', 'name')
      .populate('feeHeadId', 'name code category')
      .sort({ createdAt: 1 });
  }

  findAssignmentById(schoolId, id) {
    return StudentFeeAssignment.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) })
      .populate('studentId')
      .populate('academicYearId')
      .populate('classId')
      .populate('feeHeadId');
  }

  getStudentFeeAssignment(schoolId, id) {
    return this.findAssignmentById(schoolId, id);
  }

  findStudentFeeAssignment(schoolId, studentId, academicYearId) {
    return StudentFeeAssignment.findOne({
      schoolId: toObjectId(schoolId),
      studentId: toObjectId(studentId),
      academicYearId: toObjectId(academicYearId),
    })
      .populate('studentId')
      .populate('academicYearId')
      .populate('classId');
  }

  createAssignment(payload) {
    return StudentFeeAssignment.create(payload);
  }

  createStudentFeeAssignment(payload) {
    return StudentFeeAssignment.create(payload);
  }

  updateAssignment(schoolId, id, updates) {
    return StudentFeeAssignment.findOneAndUpdate({ _id: toObjectId(id), schoolId: toObjectId(schoolId) }, updates, {
      new: true,
      runValidators: true,
    });
  }

  updateStudentFeeAssignment(schoolId, id, updates) {
    return this.updateAssignment(schoolId, id, updates);
  }

  deleteAssignment(schoolId, id) {
    return StudentFeeAssignment.findOneAndDelete({ _id: toObjectId(id), schoolId: toObjectId(schoolId) });
  }

  /* ======================== INVOICES & BILLING ======================== */
  listInvoices(schoolId, { studentId, status, search, page = 1, limit = 50 } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (studentId) query.studentId = toObjectId(studentId);
    if (status && status !== 'ALL') query.status = status;
    if (search) {
      const safe = escapeRegex(search);
      query.invoiceNumber = { $regex: safe, $options: 'i' };
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      FeeInvoice.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('academicYearId', 'name code')
        .populate('enrollmentId', 'rollNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      FeeInvoice.countDocuments(query),
    ]).then(([items, total]) => ({ items, total, page: safePage, limit: safeLimit }));
  }

  findInvoiceById(schoolId, id) {
    return FeeInvoice.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber')
      .populate('academicYearId', 'name code')
      .populate('enrollmentId');
  }

  createInvoice(payload) {
    return FeeInvoice.create(payload);
  }

  updateInvoice(schoolId, id, updates) {
    return FeeInvoice.findOneAndUpdate({ _id: toObjectId(id), schoolId: toObjectId(schoolId) }, updates, {
      new: true,
      runValidators: true,
    });
  }

  async getNextInvoiceNumber(schoolId) {
    const year = new Date().getFullYear();
    const count = await FeeInvoice.countDocuments({ schoolId: toObjectId(schoolId) });
    const seq = String(count + 1).padStart(5, '0');
    return `INV-${year}-${seq}`;
  }

  /* ======================== FEE PAYMENTS & RECEIPTS ======================== */
  listPayments(schoolId, { studentId, invoiceId, search, page = 1, limit = 50 } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (studentId) query.studentId = toObjectId(studentId);
    if (invoiceId) query.invoiceId = toObjectId(invoiceId);
    if (search) {
      const safe = escapeRegex(search);
      query.receiptNumber = { $regex: safe, $options: 'i' };
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    return Promise.all([
      FeePayment.find(query)
        .populate('studentId', 'firstName lastName admissionNumber rollNumber')
        .populate('invoiceId', 'invoiceNumber totalAmount balanceAmount')
        .populate('studentFeeAssignmentId')
        .populate('receiptId')
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      FeePayment.countDocuments(query),
    ]).then(([items, total]) => ({ items, total, page: safePage, limit: safeLimit }));
  }

  listFeePayments(schoolId, filter = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (filter.studentId) query.studentId = toObjectId(filter.studentId);
    if (filter.invoiceId) query.invoiceId = toObjectId(filter.invoiceId);
    return FeePayment.find(query)
      .populate('studentId', 'firstName lastName admissionNumber')
      .populate('invoiceId', 'invoiceNumber')
      .populate('studentFeeAssignmentId')
      .populate('receiptId')
      .sort({ paymentDate: -1, createdAt: -1 });
  }

  findPaymentById(schoolId, id) {
    return FeePayment.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber')
      .populate('invoiceId', 'invoiceNumber totalAmount balanceAmount')
      .populate('studentFeeAssignmentId')
      .populate('receiptId');
  }

  getFeePayment(schoolId, id) {
    return this.findPaymentById(schoolId, id);
  }

  createPayment(payload) {
    return FeePayment.create(payload);
  }

  createFeePayment(payload) {
    return FeePayment.create(payload);
  }

  async getNextReceiptNumber(schoolId) {
    const year = new Date().getFullYear();
    const count = await FeePayment.countDocuments({ schoolId: toObjectId(schoolId) });
    const seq = String(count + 1).padStart(5, '0');
    return `REC-${year}-${seq}`;
  }

  /* ======================== DISCOUNTS ======================== */
  listDiscounts(schoolId, filter = {}) {
    return Discount.find({ schoolId: toObjectId(schoolId), ...filter })
      .populate('studentFeeAssignmentId')
      .populate('approvedBy', 'firstName lastName');
  }

  getDiscount(schoolId, id) {
    return Discount.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) })
      .populate('studentFeeAssignmentId')
      .populate('approvedBy');
  }

  createDiscount(payload) {
    return Discount.create(payload);
  }

  updateDiscount(schoolId, id, updates) {
    return Discount.findOneAndUpdate({ _id: toObjectId(id), schoolId: toObjectId(schoolId) }, updates, { new: true });
  }

  /* ======================== RECEIPTS ======================== */
  listReceipts(schoolId, filter = {}) {
    return Receipt.find({ schoolId: toObjectId(schoolId), ...filter })
      .populate('studentId', 'firstName lastName')
      .populate('academicYearId', 'name')
      .populate('classId', 'name')
      .sort({ paymentDate: -1 });
  }

  getReceipt(schoolId, id) {
    return Receipt.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) })
      .populate('studentId')
      .populate('academicYearId')
      .populate('classId');
  }

  findReceiptByNumber(schoolId, receiptNumber) {
    return Receipt.findOne({ schoolId: toObjectId(schoolId), receiptNumber });
  }

  createReceipt(payload) {
    return Receipt.create(payload);
  }

  countReceiptsInSchool(schoolId) {
    return Receipt.countDocuments({ schoolId: toObjectId(schoolId) });
  }

  /* ======================== FINANCE CATEGORIES ======================== */
  listFinanceCategories(schoolId, filter = {}) {
    return FinanceCategory.find({ schoolId: toObjectId(schoolId), ...filter }).sort({ name: 1 });
  }

  getFinanceCategory(schoolId, id) {
    return FinanceCategory.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) });
  }

  findFinanceCategoryByName(schoolId, name, type) {
    return FinanceCategory.findOne({ schoolId: toObjectId(schoolId), name, type });
  }

  createFinanceCategory(payload) {
    return FinanceCategory.create(payload);
  }

  /* ======================== FINANCE TRANSACTIONS ======================== */
  listFinanceTransactions(schoolId, filter = {}) {
    return FinanceTransaction.find({ schoolId: toObjectId(schoolId), ...filter })
      .populate('categoryId', 'name type')
      .sort({ transactionDate: -1 });
  }

  getFinanceTransaction(schoolId, id) {
    return FinanceTransaction.findOne({ _id: toObjectId(id), schoolId: toObjectId(schoolId) })
      .populate('categoryId');
  }

  createFinanceTransaction(payload) {
    return FinanceTransaction.create(payload);
  }

  async getFinanceSummary(schoolId, dateRange = {}) {
    const match = { schoolId: toObjectId(schoolId) };
    if (dateRange.start || dateRange.end) {
      match.transactionDate = {};
      if (dateRange.start) match.transactionDate.$gte = dateRange.start;
      if (dateRange.end) match.transactionDate.$lte = dateRange.end;
    }

    return FinanceTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$transactionType',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
  }
}

export const feeRepository = new FeeRepository();
