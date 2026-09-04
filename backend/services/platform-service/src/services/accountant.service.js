import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { FeePayment } from '../models/FeePayment.js';
import { Expense } from '../models/Expense.js';
import { Student } from '../models/Student.js';
import { escapeRegex } from '../../../shared/sanitize.js';

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function clampLimit(limit, def = 20) {
  return Math.min(100, Math.max(1, Number(limit) || def));
}

// $lookup stages shared by installments / dues views
const INVOICE_JOIN_STAGES = [
  {
    $lookup: {
      from: 'students',
      localField: 'studentId',
      foreignField: '_id',
      as: 'student',
    },
  },
  { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'studentenrollments',
      localField: 'enrollmentId',
      foreignField: '_id',
      as: 'enrollment',
    },
  },
  { $unwind: { path: '$enrollment', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'schoolclasses',
      localField: 'enrollment.classId',
      foreignField: '_id',
      as: 'klass',
    },
  },
  { $unwind: { path: '$klass', preserveNullAndEmptyArrays: true } },
  {
    $lookup: {
      from: 'sections',
      localField: 'enrollment.sectionId',
      foreignField: '_id',
      as: 'section',
    },
  },
  { $unwind: { path: '$section', preserveNullAndEmptyArrays: true } },
];

function deriveInvoiceStatus(inv, now = new Date()) {
  if (inv.status === 'PAID') return 'Paid';
  if (inv.status === 'CANCELLED') return 'Cancelled';
  if (inv.status === 'PARTIALLY_PAID') {
    return inv.dueDate && new Date(inv.dueDate) < now ? 'Overdue' : 'Partially Paid';
  }
  // DRAFT / PENDING / OVERDUE
  if (inv.dueDate && new Date(inv.dueDate) < now) return 'Overdue';
  return 'Pending';
}

function shapeInvoiceRow(row) {
  const student = row.student || {};
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
  return {
    id: row._id.toString(),
    invoiceNumber: row.invoiceNumber,
    studentId: row.studentId ? row.studentId.toString() : null,
    studentName: fullName || 'Unknown Student',
    admissionNumber: student.admissionNumber || row.enrollment?.admissionNumber || '',
    className: row.klass?.name || '',
    sectionName: row.section?.name || '',
    academicYearId: row.academicYearId ? row.academicYearId.toString() : null,
    periodLabel: row.periodLabel,
    dueDate: row.dueDate,
    totalAmount: row.totalAmount,
    paidAmount: row.paidAmount,
    discountAmount: (row.items || []).reduce((s, it) => s + (it.discountAmount || 0), 0),
    fineAmount: 0,
    pendingAmount: row.balanceAmount,
    rawStatus: row.status,
    status: deriveInvoiceStatus(row),
  };
}

export class AccountantService {
  // ==========================================
  // DASHBOARD
  // ==========================================
  async getDashboard(schoolId) {
    const sid = toObjectId(schoolId);
    const today = startOfDay();
    const monthStart = startOfMonth();
    const now = new Date();
    const weekAgo = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));

    const [
      todayAgg,
      monthAgg,
      pendingAgg,
      expenseMonthAgg,
      expenseTotalAgg,
      recentPayments,
      collectionSeries,
      duesByStatus,
    ] = await Promise.all([
      FeePayment.aggregate([
        { $match: { schoolId: sid, status: 'COMPLETED', paymentDate: { $gte: today } } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      FeePayment.aggregate([
        { $match: { schoolId: sid, status: 'COMPLETED', paymentDate: { $gte: monthStart } } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      FeeInvoice.aggregate([
        { $match: { schoolId: sid, status: { $in: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] } } },
        { $group: { _id: null, amount: { $sum: '$balanceAmount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { schoolId: sid, expenseDate: { $gte: monthStart } } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { schoolId: sid } },
        { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      FeePayment.find({ schoolId: sid })
        .populate('studentId', 'firstName lastName admissionNumber')
        .populate('invoiceId', 'invoiceNumber periodLabel')
        .sort({ paymentDate: -1 })
        .limit(8),
      FeePayment.aggregate([
        { $match: { schoolId: sid, status: 'COMPLETED', paymentDate: { $gte: weekAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      FeeInvoice.aggregate([
        { $match: { schoolId: sid } },
        { $group: { _id: '$status', amount: { $sum: '$balanceAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const first = (arr) => (arr && arr[0]) || { amount: 0, count: 0 };

    return {
      todayCollection: first(todayAgg).amount,
      todayCount: first(todayAgg).count,
      monthCollection: first(monthAgg).amount,
      monthCount: first(monthAgg).count,
      totalPendingFees: first(pendingAgg).amount,
      pendingInvoiceCount: first(pendingAgg).count,
      monthExpenses: first(expenseMonthAgg).amount,
      totalExpenses: first(expenseTotalAgg).amount,
      recentTransactions: recentPayments.map((p) => ({
        id: p._id.toString(),
        receiptNumber: p.receiptNumber,
        studentName: p.studentId
          ? [p.studentId.firstName, p.studentId.lastName].filter(Boolean).join(' ')
          : 'Unknown',
        admissionNumber: p.studentId?.admissionNumber || '',
        invoiceNumber: p.invoiceId?.invoiceNumber || '',
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        status: p.status,
        date: p.paymentDate,
      })),
      collectionOverview: collectionSeries.map((d) => ({ date: d._id, amount: d.amount, count: d.count })),
      duesSummary: duesByStatus.map((d) => ({ status: d._id, amount: d.amount, count: d.count })),
    };
  }

  // ==========================================
  // INSTALLMENTS  (invoice-period view)
  // ==========================================
  async listInstallments(schoolId, query = {}) {
    const sid = toObjectId(schoolId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = clampLimit(query.limit);
    const skip = (page - 1) * limit;

    const match = { schoolId: sid };
    if (query.academicYearId) match.academicYearId = toObjectId(query.academicYearId);
    if (query.studentId) match.studentId = toObjectId(query.studentId);
    if (query.rawStatus) match.status = query.rawStatus;

    const postMatch = {};
    if (query.classId) postMatch['enrollment.classId'] = toObjectId(query.classId);
    if (query.sectionId) postMatch['enrollment.sectionId'] = toObjectId(query.sectionId);
    if (query.search) {
      const safe = escapeRegex(query.search);
      postMatch.$or = [
        { invoiceNumber: { $regex: safe, $options: 'i' } },
        { 'student.firstName': { $regex: safe, $options: 'i' } },
        { 'student.lastName': { $regex: safe, $options: 'i' } },
        { 'student.admissionNumber': { $regex: safe, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: match },
      ...INVOICE_JOIN_STAGES,
      ...(Object.keys(postMatch).length ? [{ $match: postMatch }] : []),
      { $sort: { dueDate: 1, createdAt: -1 } },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await FeeInvoice.aggregate(pipeline);
    const rows = (result?.rows || []).map(shapeInvoiceRow);
    const total = result?.total?.[0]?.count || 0;

    // client-side "derived status" filter (Paid / Partially Paid / Pending / Overdue)
    const filtered = query.status
      ? rows.filter((r) => r.status.toLowerCase() === String(query.status).toLowerCase())
      : rows;

    return {
      data: filtered,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  // ==========================================
  // DUES / PENDING FEES
  // ==========================================
  async listDues(schoolId, query = {}) {
    const sid = toObjectId(schoolId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = clampLimit(query.limit);
    const skip = (page - 1) * limit;

    const match = {
      schoolId: sid,
      balanceAmount: { $gt: 0 },
      status: { $ne: 'CANCELLED' },
    };
    if (query.academicYearId) match.academicYearId = toObjectId(query.academicYearId);
    if (query.studentId) match.studentId = toObjectId(query.studentId);
    if (query.dueBefore) match.dueDate = { $lte: new Date(query.dueBefore) };

    const postMatch = {};
    if (query.classId) postMatch['enrollment.classId'] = toObjectId(query.classId);
    if (query.sectionId) postMatch['enrollment.sectionId'] = toObjectId(query.sectionId);
    if (query.admissionNumber) {
      postMatch['student.admissionNumber'] = {
        $regex: escapeRegex(query.admissionNumber),
        $options: 'i',
      };
    }
    if (query.search) {
      const safe = escapeRegex(query.search);
      postMatch.$or = [
        { 'student.firstName': { $regex: safe, $options: 'i' } },
        { 'student.lastName': { $regex: safe, $options: 'i' } },
        { 'student.admissionNumber': { $regex: safe, $options: 'i' } },
        { invoiceNumber: { $regex: safe, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: match },
      ...INVOICE_JOIN_STAGES,
      ...(Object.keys(postMatch).length ? [{ $match: postMatch }] : []),
      { $sort: { dueDate: 1 } },
      {
        $facet: {
          rows: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
          totals: [
            {
              $group: {
                _id: null,
                totalFee: { $sum: '$totalAmount' },
                totalPaid: { $sum: '$paidAmount' },
                totalPending: { $sum: '$balanceAmount' },
              },
            },
          ],
        },
      },
    ];

    const [result] = await FeeInvoice.aggregate(pipeline);
    const rows = (result?.rows || []).map(shapeInvoiceRow);
    const total = result?.total?.[0]?.count || 0;
    const totals = result?.totals?.[0] || { totalFee: 0, totalPaid: 0, totalPending: 0 };

    const filtered = query.status
      ? rows.filter((r) => r.status.toLowerCase() === String(query.status).toLowerCase())
      : rows;

    return {
      data: filtered,
      summary: totals,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  // ==========================================
  // RECEIPTS  (fee payments, enriched)
  // ==========================================
  async listReceipts(schoolId, query = {}) {
    const sid = toObjectId(schoolId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = clampLimit(query.limit);
    const skip = (page - 1) * limit;

    const match = { schoolId: sid };
    if (query.paymentMethod) match.paymentMethod = query.paymentMethod;
    if (query.status) match.status = query.status;
    if (query.dateFrom || query.dateTo) {
      match.paymentDate = {};
      if (query.dateFrom) match.paymentDate.$gte = new Date(query.dateFrom);
      if (query.dateTo) match.paymentDate.$lte = new Date(query.dateTo);
    }

    const postMatch = {};
    if (query.search) {
      const safe = escapeRegex(query.search);
      postMatch.$or = [
        { receiptNumber: { $regex: safe, $options: 'i' } },
        { 'student.firstName': { $regex: safe, $options: 'i' } },
        { 'student.lastName': { $regex: safe, $options: 'i' } },
        { 'student.admissionNumber': { $regex: safe, $options: 'i' } },
        { 'invoice.invoiceNumber': { $regex: safe, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: match },
      { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'feeinvoices', localField: 'invoiceId', foreignField: '_id', as: 'invoice' } },
      { $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true } },
      ...(Object.keys(postMatch).length ? [{ $match: postMatch }] : []),
      { $sort: { paymentDate: -1 } },
      { $facet: { rows: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'count' }] } },
    ];

    const [result] = await FeePayment.aggregate(pipeline);
    const total = result?.total?.[0]?.count || 0;
    const rows = (result?.rows || []).map((r) => this._shapeReceipt(r));
    return { data: rows, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  _shapeReceipt(r) {
    const s = r.student || {};
    return {
      id: r._id.toString(),
      receiptNumber: r.receiptNumber,
      studentId: r.studentId ? r.studentId.toString() : null,
      studentName: [s.firstName, s.lastName].filter(Boolean).join(' ') || 'Unknown Student',
      admissionNumber: s.admissionNumber || '',
      invoiceId: r.invoiceId ? r.invoiceId.toString() : null,
      invoiceNumber: r.invoice?.invoiceNumber || '',
      periodLabel: r.invoice?.periodLabel || '',
      amount: r.amount,
      paymentMethod: r.paymentMethod,
      paymentReference: r.paymentReference,
      paymentDate: r.paymentDate,
      remarks: r.remarks,
      status: r.status,
      collectedBy: r.collectedBy,
      createdAt: r.createdAt,
    };
  }

  async getReceipt(schoolId, id) {
    const sid = toObjectId(schoolId);
    const pay = await FeePayment.findOne({ _id: id, schoolId: sid })
      .populate('studentId', 'firstName lastName admissionNumber')
      .populate('invoiceId', 'invoiceNumber periodLabel totalAmount paidAmount balanceAmount dueDate');
    if (!pay) throw new AppError('Receipt not found', 404);
    return {
      ...this._shapeReceipt({
        ...pay.toObject(),
        _id: pay._id,
        student: pay.studentId,
        invoice: pay.invoiceId,
        studentId: pay.studentId?._id,
        invoiceId: pay.invoiceId?._id,
      }),
      invoice: pay.invoiceId
        ? {
            id: pay.invoiceId._id.toString(),
            invoiceNumber: pay.invoiceId.invoiceNumber,
            periodLabel: pay.invoiceId.periodLabel,
            totalAmount: pay.invoiceId.totalAmount,
            paidAmount: pay.invoiceId.paidAmount,
            balanceAmount: pay.invoiceId.balanceAmount,
            dueDate: pay.invoiceId.dueDate,
          }
        : null,
    };
  }

  // ==========================================
  // INVOICES (enriched, paginated)
  // ==========================================
  async listInvoicesView(schoolId, query = {}) {
    const sid = toObjectId(schoolId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = clampLimit(query.limit);
    const skip = (page - 1) * limit;

    const match = { schoolId: sid };
    if (query.status) match.status = query.status;
    if (query.academicYearId) match.academicYearId = toObjectId(query.academicYearId);
    if (query.studentId) match.studentId = toObjectId(query.studentId);

    const postMatch = {};
    if (query.classId) postMatch['enrollment.classId'] = toObjectId(query.classId);
    if (query.search) {
      const safe = escapeRegex(query.search);
      postMatch.$or = [
        { invoiceNumber: { $regex: safe, $options: 'i' } },
        { 'student.firstName': { $regex: safe, $options: 'i' } },
        { 'student.lastName': { $regex: safe, $options: 'i' } },
        { 'student.admissionNumber': { $regex: safe, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: match },
      ...INVOICE_JOIN_STAGES,
      ...(Object.keys(postMatch).length ? [{ $match: postMatch }] : []),
      { $sort: { createdAt: -1 } },
      { $facet: { rows: [{ $skip: skip }, { $limit: limit }], total: [{ $count: 'count' }] } },
    ];

    const [result] = await FeeInvoice.aggregate(pipeline);
    const total = result?.total?.[0]?.count || 0;
    return {
      data: (result?.rows || []).map(shapeInvoiceRow),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async studentDueHistory(schoolId, studentId) {
    const sid = toObjectId(schoolId);
    const student = await Student.findOne({ _id: studentId, schoolId: sid });
    if (!student) throw new AppError('Student not found', 404);

    const [invoices, payments] = await Promise.all([
      FeeInvoice.find({ schoolId: sid, studentId: toObjectId(studentId) }).sort({ createdAt: -1 }),
      FeePayment.find({ schoolId: sid, studentId: toObjectId(studentId) })
        .populate('invoiceId', 'invoiceNumber periodLabel')
        .sort({ paymentDate: -1 }),
    ]);

    return {
      student: {
        id: student._id.toString(),
        name: [student.firstName, student.lastName].filter(Boolean).join(' '),
        admissionNumber: student.admissionNumber,
        photo: student.photo,
      },
      invoices: invoices.map((i) => i.toPublicJSON()),
      payments: payments.map((p) => ({
        ...p.toPublicJSON(),
        invoiceNumber: p.invoiceId?.invoiceNumber || '',
        periodLabel: p.invoiceId?.periodLabel || '',
      })),
    };
  }

  // ==========================================
  // TRANSACTIONS  (unified fee-payment + expense ledger)
  // ==========================================
  async listTransactions(schoolId, query = {}) {
    const sid = toObjectId(schoolId);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = clampLimit(query.limit);
    const skip = (page - 1) * limit;

    const dateMatch = {};
    if (query.dateFrom) dateMatch.$gte = new Date(query.dateFrom);
    if (query.dateTo) dateMatch.$lte = new Date(query.dateTo);
    const hasDate = Object.keys(dateMatch).length > 0;

    const wantIncome = !query.type || query.type === 'ALL' || query.type === 'FEE_PAYMENT' || query.type === 'INCOME';
    const wantExpense = !query.type || query.type === 'ALL' || query.type === 'EXPENSE';

    const paymentPipeline = [
      {
        $match: {
          schoolId: sid,
          ...(hasDate ? { paymentDate: dateMatch } : {}),
          ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
          ...(query.status ? { status: query.status } : {}),
        },
      },
      {
        $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' },
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $lookup: { from: 'feeinvoices', localField: 'invoiceId', foreignField: '_id', as: 'invoice' },
      },
      { $unwind: { path: '$invoice', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          txnType: { $literal: 'FEE_PAYMENT' },
          direction: { $literal: 'CREDIT' },
          refNumber: '$receiptNumber',
          date: '$paymentDate',
          amount: '$amount',
          paymentMethod: '$paymentMethod',
          reference: '$paymentReference',
          status: '$status',
          createdBy: '$collectedBy',
          party: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$student.firstName', ''] },
                  ' ',
                  { $ifNull: ['$student.lastName', ''] },
                ],
              },
            },
          },
          category: { $literal: 'Fee Collection' },
          note: '$invoice.periodLabel',
          createdAt: 1,
        },
      },
    ];

    const expensePipeline = [
      {
        $match: {
          schoolId: sid,
          ...(hasDate ? { expenseDate: dateMatch } : {}),
          ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
        },
      },
      {
        $project: {
          _id: 1,
          txnType: { $literal: 'EXPENSE' },
          direction: { $literal: 'DEBIT' },
          refNumber: '$expenseNumber',
          date: '$expenseDate',
          amount: '$amount',
          paymentMethod: '$paymentMethod',
          reference: '$reference',
          status: '$paymentStatus',
          createdBy: '$createdBy',
          party: '$vendorName',
          category: '$category',
          note: '$title',
          createdAt: 1,
        },
      },
    ];

    let base;
    if (wantIncome && wantExpense) {
      base = FeePayment.aggregate([...paymentPipeline, { $unionWith: { coll: 'expenses', pipeline: expensePipeline } }]);
    } else if (wantExpense) {
      base = Expense.aggregate(expensePipeline);
    } else {
      base = FeePayment.aggregate(paymentPipeline);
    }

    const all = await base;
    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      for (let i = all.length - 1; i >= 0; i -= 1) {
        const t = all[i];
        if (!(rx.test(t.refNumber || '') || rx.test(t.party || '') || rx.test(t.note || '') || rx.test(t.reference || ''))) {
          all.splice(i, 1);
        }
      }
    }
    all.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = all.length;
    const rows = all.slice(skip, skip + limit).map((t) => ({
      id: t._id.toString(),
      transactionId: t.refNumber,
      type: t.txnType,
      direction: t.direction,
      date: t.date,
      party: t.party || '',
      category: t.category,
      note: t.note || '',
      amount: t.amount,
      paymentMethod: t.paymentMethod,
      reference: t.reference || '',
      status: t.status,
      createdBy: t.createdBy || '',
    }));

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getTransaction(schoolId, id, type) {
    const sid = toObjectId(schoolId);
    if (type === 'EXPENSE') {
      const exp = await Expense.findOne({ _id: id, schoolId: sid });
      if (!exp) throw new AppError('Transaction not found', 404);
      const pub = exp.toPublicJSON();
      return {
        ...pub,
        type: 'EXPENSE',
        direction: 'DEBIT',
        timeline: [
          { label: 'Expense recorded', at: pub.createdAt, by: pub.createdBy },
          ...(pub.approvalStatus === 'APPROVED'
            ? [{ label: 'Approved', at: pub.updatedAt, by: pub.approvedBy }]
            : []),
        ],
      };
    }
    const pay = await FeePayment.findOne({ _id: id, schoolId: sid })
      .populate('studentId', 'firstName lastName admissionNumber')
      .populate('invoiceId', 'invoiceNumber periodLabel totalAmount paidAmount balanceAmount');
    if (!pay) throw new AppError('Transaction not found', 404);
    const pub = pay.toPublicJSON();
    return {
      ...pub,
      type: 'FEE_PAYMENT',
      direction: 'CREDIT',
      student: pay.studentId
        ? {
            id: pay.studentId._id.toString(),
            name: [pay.studentId.firstName, pay.studentId.lastName].filter(Boolean).join(' '),
            admissionNumber: pay.studentId.admissionNumber,
          }
        : null,
      invoice: pay.invoiceId
        ? {
            id: pay.invoiceId._id.toString(),
            invoiceNumber: pay.invoiceId.invoiceNumber,
            periodLabel: pay.invoiceId.periodLabel,
            totalAmount: pay.invoiceId.totalAmount,
            paidAmount: pay.invoiceId.paidAmount,
            balanceAmount: pay.invoiceId.balanceAmount,
          }
        : null,
      timeline: [{ label: 'Payment collected', at: pub.paymentDate, by: pub.collectedBy }],
    };
  }

  // ==========================================
  // REPORTS
  // ==========================================
  async report(schoolId, category, query = {}) {
    const sid = toObjectId(schoolId);
    const dateMatch = {};
    if (query.dateFrom) dateMatch.$gte = new Date(query.dateFrom);
    if (query.dateTo) dateMatch.$lte = new Date(query.dateTo);
    const hasDate = Object.keys(dateMatch).length > 0;

    switch (category) {
      case 'fee-collection':
      case 'receipt': {
        const rows = await FeePayment.aggregate([
          { $match: { schoolId: sid, status: 'COMPLETED', ...(hasDate ? { paymentDate: dateMatch } : {}) } },
          { $lookup: { from: 'students', localField: 'studentId', foreignField: '_id', as: 'student' } },
          { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
          { $sort: { paymentDate: -1 } },
        ]);
        return {
          category,
          rows: rows.map((r) => ({
            receiptNumber: r.receiptNumber,
            date: r.paymentDate,
            studentName: [r.student?.firstName, r.student?.lastName].filter(Boolean).join(' '),
            admissionNumber: r.student?.admissionNumber || '',
            amount: r.amount,
            paymentMethod: r.paymentMethod,
            reference: r.paymentReference,
            collectedBy: r.collectedBy,
          })),
          summary: { totalAmount: rows.reduce((s, r) => s + r.amount, 0), count: rows.length },
        };
      }

      case 'dues':
      case 'pending': {
        const dues = await this.listDues(schoolId, { ...query, limit: 1000, page: 1 });
        return { category, rows: dues.data, summary: dues.summary };
      }

      case 'expense': {
        const rows = await Expense.find({
          schoolId: sid,
          ...(hasDate ? { expenseDate: dateMatch } : {}),
        }).sort({ expenseDate: -1 });
        return {
          category,
          rows: rows.map((r) => r.toPublicJSON()),
          summary: { totalAmount: rows.reduce((s, r) => s + r.amount, 0), count: rows.length },
        };
      }

      case 'transaction': {
        const txns = await this.listTransactions(schoolId, { ...query, limit: 1000, page: 1 });
        return { category, rows: txns.data, summary: { count: txns.pagination.total } };
      }

      case 'invoice': {
        const rows = await FeeInvoice.aggregate([
          { $match: { schoolId: sid, ...(hasDate ? { createdAt: dateMatch } : {}) } },
          ...INVOICE_JOIN_STAGES,
          { $sort: { createdAt: -1 } },
        ]);
        return {
          category,
          rows: rows.map(shapeInvoiceRow),
          summary: {
            totalAmount: rows.reduce((s, r) => s + (r.totalAmount || 0), 0),
            totalPaid: rows.reduce((s, r) => s + (r.paidAmount || 0), 0),
            count: rows.length,
          },
        };
      }

      case 'class-wise': {
        const rows = await FeeInvoice.aggregate([
          { $match: { schoolId: sid } },
          ...INVOICE_JOIN_STAGES,
          {
            $group: {
              _id: '$klass.name',
              totalBilled: { $sum: '$totalAmount' },
              totalCollected: { $sum: '$paidAmount' },
              totalPending: { $sum: '$balanceAmount' },
              invoices: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        return {
          category,
          rows: rows.map((r) => ({
            className: r._id || 'Unassigned',
            totalBilled: r.totalBilled,
            totalCollected: r.totalCollected,
            totalPending: r.totalPending,
            invoices: r.invoices,
          })),
        };
      }

      case 'payment-method': {
        const rows = await FeePayment.aggregate([
          { $match: { schoolId: sid, status: 'COMPLETED', ...(hasDate ? { paymentDate: dateMatch } : {}) } },
          { $group: { _id: '$paymentMethod', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
          { $sort: { amount: -1 } },
        ]);
        return { category, rows: rows.map((r) => ({ paymentMethod: r._id, amount: r.amount, count: r.count })) };
      }

      case 'daily': {
        const rows = await FeePayment.aggregate([
          { $match: { schoolId: sid, status: 'COMPLETED', ...(hasDate ? { paymentDate: dateMatch } : {}) } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
              amount: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        return { category, rows: rows.map((r) => ({ date: r._id, amount: r.amount, count: r.count })) };
      }

      case 'monthly': {
        const rows = await FeePayment.aggregate([
          { $match: { schoolId: sid, status: 'COMPLETED', ...(hasDate ? { paymentDate: dateMatch } : {}) } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$paymentDate' } },
              amount: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);
        return { category, rows: rows.map((r) => ({ month: r._id, amount: r.amount, count: r.count })) };
      }

      default:
        throw new AppError(`Unknown report category: ${category}`, 400);
    }
  }
}

export const accountantService = new AccountantService();
