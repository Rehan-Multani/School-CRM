import { FeeHead } from '../models/FeeHead.js';
import { FeeStructure } from '../models/FeeStructure.js';
import { StudentFeeAssignment } from '../models/StudentFeeAssignment.js';
import { Discount } from '../models/Discount.js';
import { FeePayment } from '../models/FeePayment.js';
import { Receipt } from '../models/Receipt.js';
import { FinanceCategory } from '../models/FinanceCategory.js';
import { FinanceTransaction } from '../models/FinanceTransaction.js';

/**
 * Fee module data access layer.
 */
export const feeRepository = {
  /* ======================== FEE HEADS ======================== */
  listFeeHeads(schoolId, filter = {}) {
    return FeeHead.find({ schoolId, ...filter }).sort({ name: 1 });
  },
  getFeeHead(schoolId, id) {
    return FeeHead.findOne({ _id: id, schoolId });
  },
  findFeeHeadByCode(schoolId, code) {
    return FeeHead.findOne({ schoolId, code });
  },
  findFeeHeadByName(schoolId, name) {
    return FeeHead.findOne({ schoolId, name });
  },
  createFeeHead(payload) {
    return FeeHead.create(payload);
  },
  updateFeeHead(schoolId, id, updates) {
    return FeeHead.findOneAndUpdate({ _id: id, schoolId }, updates, { new: true });
  },

  /* ======================== FEE STRUCTURES ======================== */
  listFeeStructures(schoolId, filter = {}) {
    return FeeStructure.find({ schoolId, ...filter })
      .populate('academicYearId', 'name code')
      .populate('classId', 'name')
      .populate('items.feeHeadId', 'name code');
  },
  getFeeStructure(schoolId, id) {
    return FeeStructure.findOne({ _id: id, schoolId })
      .populate('academicYearId')
      .populate('classId')
      .populate('items.feeHeadId');
  },
  findFeeStructureByYearAndClass(schoolId, academicYearId, classId) {
    return FeeStructure.findOne({ schoolId, academicYearId, classId })
      .populate('items.feeHeadId');
  },
  createFeeStructure(payload) {
    return FeeStructure.create(payload);
  },

  /* ======================== STUDENT FEE ASSIGNMENT ======================== */
  listStudentFeeAssignments(schoolId, filter = {}) {
    return StudentFeeAssignment.find({ schoolId, ...filter })
      .populate('studentId', 'firstName lastName admissionNumber')
      .populate('academicYearId', 'name code')
      .populate('classId', 'name');
  },
  getStudentFeeAssignment(schoolId, id) {
    return StudentFeeAssignment.findOne({ _id: id, schoolId })
      .populate('studentId')
      .populate('academicYearId')
      .populate('classId');
  },
  findStudentFeeAssignment(schoolId, studentId, academicYearId) {
    return StudentFeeAssignment.findOne({ schoolId, studentId, academicYearId })
      .populate('studentId')
      .populate('academicYearId')
      .populate('classId');
  },
  createStudentFeeAssignment(payload) {
    return StudentFeeAssignment.create(payload);
  },
  updateStudentFeeAssignment(schoolId, id, updates) {
    return StudentFeeAssignment.findOneAndUpdate({ _id: id, schoolId }, updates, { new: true });
  },

  /* ======================== DISCOUNTS ======================== */
  listDiscounts(schoolId, filter = {}) {
    return Discount.find({ schoolId, ...filter })
      .populate('studentFeeAssignmentId')
      .populate('approvedBy', 'firstName lastName');
  },
  getDiscount(schoolId, id) {
    return Discount.findOne({ _id: id, schoolId })
      .populate('studentFeeAssignmentId')
      .populate('approvedBy');
  },
  createDiscount(payload) {
    return Discount.create(payload);
  },
  updateDiscount(schoolId, id, updates) {
    return Discount.findOneAndUpdate({ _id: id, schoolId }, updates, { new: true });
  },

  /* ======================== FEE PAYMENTS ======================== */
  listFeePayments(schoolId, filter = {}) {
    return FeePayment.find({ schoolId, ...filter })
      .populate('studentFeeAssignmentId')
      .populate('receiptId')
      .sort({ transactionDate: -1 });
  },
  getFeePayment(schoolId, id) {
    return FeePayment.findOne({ _id: id, schoolId })
      .populate('studentFeeAssignmentId')
      .populate('receiptId');
  },
  createFeePayment(payload) {
    return FeePayment.create(payload);
  },

  /* ======================== RECEIPTS ======================== */
  listReceipts(schoolId, filter = {}) {
    return Receipt.find({ schoolId, ...filter })
      .populate('studentId', 'firstName lastName')
      .populate('academicYearId', 'name')
      .populate('classId', 'name')
      .sort({ paymentDate: -1 });
  },
  getReceipt(schoolId, id) {
    return Receipt.findOne({ _id: id, schoolId })
      .populate('studentId')
      .populate('academicYearId')
      .populate('classId');
  },
  findReceiptByNumber(schoolId, receiptNumber) {
    return Receipt.findOne({ schoolId, receiptNumber });
  },
  createReceipt(payload) {
    return Receipt.create(payload);
  },
  countReceiptsInSchool(schoolId) {
    return Receipt.countDocuments({ schoolId });
  },

  /* ======================== FINANCE CATEGORIES ======================== */
  listFinanceCategories(schoolId, filter = {}) {
    return FinanceCategory.find({ schoolId, ...filter }).sort({ name: 1 });
  },
  getFinanceCategory(schoolId, id) {
    return FinanceCategory.findOne({ _id: id, schoolId });
  },
  findFinanceCategoryByName(schoolId, name, type) {
    return FinanceCategory.findOne({ schoolId, name, type });
  },
  createFinanceCategory(payload) {
    return FinanceCategory.create(payload);
  },

  /* ======================== FINANCE TRANSACTIONS ======================== */
  listFinanceTransactions(schoolId, filter = {}) {
    return FinanceTransaction.find({ schoolId, ...filter })
      .populate('categoryId', 'name type')
      .sort({ transactionDate: -1 });
  },
  getFinanceTransaction(schoolId, id) {
    return FinanceTransaction.findOne({ _id: id, schoolId })
      .populate('categoryId');
  },
  createFinanceTransaction(payload) {
    return FinanceTransaction.create(payload);
  },
  
  // Aggregations for reports
  async getFinanceSummary(schoolId, dateRange = {}) {
    const match = { schoolId };
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
  },
};
