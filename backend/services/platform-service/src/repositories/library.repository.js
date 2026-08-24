import mongoose from 'mongoose';
import { LibraryBook } from '../models/LibraryBook.js';
import { BookCopy } from '../models/BookCopy.js';
import { LibraryIssue } from '../models/LibraryIssue.js';
import { LibraryReservation } from '../models/LibraryReservation.js';
import { LibraryTransaction } from '../models/LibraryTransaction.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { bookCopyRepository } from './bookCopy.repository.js';
import { libraryTransactionRepository } from './libraryTransaction.repository.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { AppError } from '../../../shared/AppError.js';

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
}

class LibraryRepository {
  // Books CRUD
  async listBooks(schoolId, query = {}) {
    const filter = { schoolId: toObjectId(schoolId) };

    if (query.category && query.category !== 'ALL') {
      filter.category = query.category.toUpperCase();
    }

    if (query.status && query.status !== 'ALL') {
      if (query.status === 'AVAILABLE') {
        filter.availableCopies = { $gt: 0 };
      } else if (query.status === 'OUT_OF_STOCK') {
        filter.availableCopies = { $lte: 0 };
      }
    }

    if (query.isActive === 'true') {
      filter.isActive = { $ne: false };
    } else if (query.isActive === 'false') {
      filter.isActive = false;
    }

    if (query.search?.trim()) {
      const safe = escapeRegex(query.search.trim());
      const regex = new RegExp(safe, 'i');
      filter.$or = [
        { title: regex },
        { author: regex },
        { isbn: regex },
        { bookCode: regex },
        { publisher: regex },
        { category: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 100));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      LibraryBook.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LibraryBook.countDocuments(filter),
    ]);

    // Fetch realtime copy stats for these books
    const bookIds = items.map((b) => b._id);
    const copyStatsMap = await bookCopyRepository.getCopiesStatsForBooks(schoolId, bookIds);

    return {
      items: items.map((b) => {
        const stats = copyStatsMap[b._id.toString()];
        return b.toPublicJSON(stats);
      }),
      total,
      page,
      limit,
    };
  }

  async findBookById(schoolId, id) {
    const book = await LibraryBook.findOne({ schoolId: toObjectId(schoolId), _id: toObjectId(id) });
    if (!book) return null;
    const stats = (await bookCopyRepository.getCopiesStatsForBooks(schoolId, [book._id]))[book._id.toString()];
    return { book, stats };
  }

  async createBook(data) {
    const book = await LibraryBook.create({
      ...data,
      schoolId: toObjectId(data.schoolId),
    });

    // Auto-generate physical BookCopy records if totalCopies > 0
    const count = Math.max(1, Number(data.totalCopies) || 1);
    const copies = [];
    const prefix = (data.category ? data.category.slice(0, 3) : 'BK').toUpperCase();
    const shortId = book._id.toString().slice(-4).toUpperCase();

    for (let i = 1; i <= count; i++) {
      const seq = String(i).padStart(3, '0');
      const accessionNumber = `ACC-${prefix}-${shortId}-${seq}`;
      copies.push({
        schoolId: toObjectId(data.schoolId),
        bookId: book._id,
        accessionNumber,
        barcode: accessionNumber,
        rackNumber: data.rackNumber || '',
        shelfNumber: data.shelfNumber || '',
        status: 'AVAILABLE',
        condition: 'GOOD',
        price: data.price || 0,
      });
    }

    if (copies.length) {
      await BookCopy.insertMany(copies);
      await bookCopyRepository.syncBookCopyCounts(data.schoolId, book._id);
    }

    return book;
  }

  async updateBook(schoolId, id, updates) {
    const updated = await LibraryBook.findOneAndUpdate(
      { schoolId: toObjectId(schoolId), _id: toObjectId(id) },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updated) return null;
    const stats = (await bookCopyRepository.getCopiesStatsForBooks(schoolId, [updated._id]))[updated._id.toString()];
    return updated.toPublicJSON(stats);
  }

  async deleteBook(schoolId, id) {
    // Delete copies and the book itself
    await BookCopy.deleteMany({ schoolId: toObjectId(schoolId), bookId: toObjectId(id) });
    return LibraryBook.findOneAndDelete({ schoolId: toObjectId(schoolId), _id: toObjectId(id) });
  }

  // Categories aggregation
  async getCategories(schoolId) {
    const schoolObjId = toObjectId(schoolId);
    return LibraryBook.aggregate([
      { $match: { schoolId: schoolObjId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
          availableCopies: { $sum: '$availableCopies' },
        },
      },
      {
        $project: {
          name: '$_id',
          count: 1,
          totalCopies: 1,
          availableCopies: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  // Authors aggregation
  async getAuthors(schoolId) {
    const schoolObjId = toObjectId(schoolId);
    return LibraryBook.aggregate([
      { $match: { schoolId: schoolObjId, author: { $ne: '' } } },
      {
        $group: {
          _id: '$author',
          booksCount: { $sum: 1 },
          categories: { $addToSet: '$category' },
          totalCopies: { $sum: '$totalCopies' },
        },
      },
      {
        $project: {
          name: '$_id',
          booksCount: 1,
          categories: 1,
          totalCopies: 1,
        },
      },
      { $sort: { booksCount: -1 } },
    ]);
  }

  // Publishers aggregation
  async getPublishers(schoolId) {
    const schoolObjId = toObjectId(schoolId);
    return LibraryBook.aggregate([
      { $match: { schoolId: schoolObjId, publisher: { $ne: '' } } },
      {
        $group: {
          _id: '$publisher',
          booksCount: { $sum: 1 },
          totalCopies: { $sum: '$totalCopies' },
        },
      },
      {
        $project: {
          name: '$_id',
          booksCount: 1,
          totalCopies: 1,
        },
      },
      { $sort: { booksCount: -1 } },
    ]);
  }

  // Issues & Circulation
  async listIssues(schoolId, query = {}) {
    const filter = { schoolId: toObjectId(schoolId) };

    if (query.status && query.status !== 'ALL') {
      if (query.status.toUpperCase() === 'OVERDUE') {
        filter.status = 'ISSUED';
        filter.dueDate = { $lt: new Date() };
      } else {
        filter.status = query.status.toUpperCase();
      }
    }

    if (query.fineStatus && query.fineStatus !== 'ALL') {
      filter.fineStatus = query.fineStatus.toUpperCase();
    }

    if (query.borrowerType && query.borrowerType !== 'ALL') {
      filter.borrowerType = query.borrowerType.toUpperCase();
    }

    if (query.borrowerRefId) {
      filter.borrowerRefId = toObjectId(query.borrowerRefId);
    }

    if (query.bookId) {
      filter.bookId = toObjectId(query.bookId);
    } else if (query.category && query.category !== 'ALL') {
      const bookIds = await LibraryBook.find({
        schoolId: toObjectId(schoolId),
        category: query.category,
      }).distinct('_id');
      filter.bookId = { $in: bookIds };
    }

    if (query.startDate || query.endDate) {
      filter.issueDate = {};
      if (query.startDate) filter.issueDate.$gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.issueDate.$lte = end;
      }
    }

    if (query.search?.trim()) {
      const regex = new RegExp(escapeRegex(query.search.trim()), 'i');
      filter.$or = [
        { bookTitle: regex },
        { bookCode: regex },
        { accessionNumber: regex },
        { borrowerName: regex },
        { borrowerCode: regex },
        { borrowerClass: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 100));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      LibraryIssue.find(filter)
        .populate('bookId', 'title author category isbn bookCode price')
        .sort({ issueDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LibraryIssue.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findIssueById(schoolId, id) {
    return LibraryIssue.findOne({ schoolId: toObjectId(schoolId), _id: toObjectId(id) })
      .populate('bookId', 'title author category isbn bookCode price')
      .populate('copyId');
  }

  async updateFineStatus(schoolId, issueId, fineStatus) {
    return LibraryIssue.findOneAndUpdate(
      { schoolId: toObjectId(schoolId), _id: toObjectId(issueId) },
      { $set: { fineStatus } },
      { new: true, runValidators: true }
    ).populate('bookId', 'title author category isbn bookCode price');
  }

  async createIssue(payload, performedBy = 'Librarian') {
    const schoolObjId = toObjectId(payload.schoolId);
    const bookObjId = toObjectId(payload.bookId);
    const copyObjId = toObjectId(payload.copyId);

    // Also guard against the same borrower already holding an unreturned copy of this book.
    const existingActiveIssue = await LibraryIssue.findOne({
      schoolId: schoolObjId,
      bookId: bookObjId,
      borrowerRefId: toObjectId(payload.borrowerRefId),
      status: 'ISSUED',
    });
    if (existingActiveIssue) {
      throw new AppError('This borrower already has an unreturned copy of this book.', 409);
    }

    // Atomically claim the physical copy: this conditional update only succeeds if the
    // copy is still AVAILABLE, so two concurrent issue requests for the same copy cannot
    // both win — the loser gets null here, before any LibraryIssue record is created.
    const claimedCopy = await BookCopy.findOneAndUpdate(
      { _id: copyObjId, schoolId: schoolObjId, status: 'AVAILABLE' },
      { $set: { status: 'ISSUED' } },
      { new: true }
    );
    if (!claimedCopy) {
      throw new AppError('This copy was just issued to someone else. Please pick another copy.', 409);
    }

    // Create issue record; if this fails, release the copy claim so it isn't stuck ISSUED with no issue record.
    let issue;
    try {
      issue = await LibraryIssue.create({
        ...payload,
        schoolId: schoolObjId,
        bookId: bookObjId,
        copyId: copyObjId,
        borrowerRefId: toObjectId(payload.borrowerRefId),
      });
    } catch (err) {
      await BookCopy.updateOne(
        { _id: copyObjId, schoolId: schoolObjId },
        { $set: { status: 'AVAILABLE' } }
      );
      throw err;
    }

    // Sync book copy counts
    await bookCopyRepository.syncBookCopyCounts(schoolObjId, bookObjId);

    // 4. Log transaction
    await libraryTransactionRepository.logTransaction({
      schoolId: schoolObjId,
      issueId: issue._id,
      bookId: bookObjId,
      copyId: copyObjId,
      bookTitle: payload.bookTitle,
      accessionNumber: payload.accessionNumber || '',
      borrowerRefId: payload.borrowerRefId,
      borrowerName: payload.borrowerName,
      borrowerType: payload.borrowerType,
      borrowerCode: payload.borrowerCode,
      type: 'ISSUE',
      performedBy,
      details: `Book "${payload.bookTitle}" (Copy: ${payload.accessionNumber || 'N/A'}) issued to ${payload.borrowerName} (${payload.borrowerType})`,
    });

    return issue;
  }

  async returnIssue(schoolId, issueId, returnData, performedBy = 'Librarian') {
    const schoolObjId = toObjectId(schoolId);
    const issueObjId = toObjectId(issueId);

    const fineAmount = Number(returnData.fineAmount) || 0;
    const update = {
      returnDate: returnData.returnDate || new Date(),
      status: 'RETURNED',
      fineAmount,
      fineStatus: returnData.fineStatus || (fineAmount > 0 ? 'PAID' : 'NONE'),
      conditionOnReturn: returnData.conditionOnReturn || 'GOOD',
    };
    if (returnData.remarks) update.remarks = returnData.remarks;

    // Atomic guard: only succeeds while status is still ISSUED, so a duplicate/concurrent
    // return request for the same issue cannot double-process (double-credit copy
    // availability, double-log a transaction, or double-apply a fine).
    const issue = await LibraryIssue.findOneAndUpdate(
      { schoolId: schoolObjId, _id: issueObjId, status: 'ISSUED' },
      { $set: update },
      { new: true }
    );
    if (!issue) return null;

    // 2. Update physical BookCopy status based on condition
    let newCopyStatus = 'AVAILABLE';
    if (returnData.conditionOnReturn === 'DAMAGED') newCopyStatus = 'DAMAGED';
    else if (returnData.conditionOnReturn === 'LOST') newCopyStatus = 'LOST';

    if (issue.copyId) {
      await BookCopy.updateOne(
        { _id: issue.copyId, schoolId: schoolObjId },
        { $set: { status: newCopyStatus, condition: returnData.conditionOnReturn === 'GOOD' ? 'GOOD' : 'POOR' } }
      );
    }

    // 3. Sync book copy counts
    await bookCopyRepository.syncBookCopyCounts(schoolObjId, issue.bookId);

    // 4. Log transaction
    const txType = returnData.conditionOnReturn === 'LOST' ? 'LOST' : returnData.conditionOnReturn === 'DAMAGED' ? 'DAMAGED' : 'RETURN';
    await libraryTransactionRepository.logTransaction({
      schoolId: schoolObjId,
      issueId: issue._id,
      bookId: issue.bookId,
      copyId: issue.copyId,
      bookTitle: issue.bookTitle,
      accessionNumber: issue.accessionNumber || '',
      borrowerRefId: issue.borrowerRefId,
      borrowerName: issue.borrowerName,
      borrowerType: issue.borrowerType,
      borrowerCode: issue.borrowerCode,
      type: txType,
      performedBy,
      fineAmount: issue.fineAmount,
      fineStatus: issue.fineStatus,
      details: `Book "${issue.bookTitle}" returned by ${issue.borrowerName}. Condition: ${issue.conditionOnReturn}. Fine: ₹${issue.fineAmount}`,
    });

    return issue;
  }

  async renewIssue(schoolId, issueId, extendDays = 14, performedBy = 'Librarian') {
    const schoolObjId = toObjectId(schoolId);
    const issueObjId = toObjectId(issueId);

    const issue = await LibraryIssue.findOne({ schoolId: schoolObjId, _id: issueObjId });
    if (!issue) return null;

    const currentDue = new Date(issue.dueDate);
    const newDueDate = new Date(currentDue.getTime() + extendDays * 24 * 60 * 60 * 1000);

    issue.dueDate = newDueDate;
    issue.renewalCount = (issue.renewalCount || 0) + 1;
    issue.renewedAt = new Date();
    issue.lastRenewedBy = performedBy;
    await issue.save();

    // Log transaction
    await libraryTransactionRepository.logTransaction({
      schoolId: schoolObjId,
      issueId: issue._id,
      bookId: issue.bookId,
      copyId: issue.copyId,
      bookTitle: issue.bookTitle,
      accessionNumber: issue.accessionNumber || '',
      borrowerRefId: issue.borrowerRefId,
      borrowerName: issue.borrowerName,
      borrowerType: issue.borrowerType,
      borrowerCode: issue.borrowerCode,
      type: 'RENEW',
      performedBy,
      details: `Book "${issue.bookTitle}" renewed by ${issue.borrowerName}. New Due Date: ${newDueDate.toISOString().slice(0, 10)}. Renewal #${issue.renewalCount}`,
    });

    return issue;
  }

  // Aggregate Stats
  async getLibraryStats(schoolId) {
    const schoolObjId = toObjectId(schoolId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [bookAgg, copyAgg, issueAgg, todayAgg, reservationPending] = await Promise.all([
      LibraryBook.aggregate([
        { $match: { schoolId: schoolObjId } },
        {
          $group: {
            _id: null,
            totalTitles: { $sum: 1 },
          },
        },
      ]),
      BookCopy.aggregate([
        { $match: { schoolId: schoolObjId } },
        {
          $group: {
            _id: null,
            totalCopies: { $sum: 1 },
            availableCopies: { $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] } },
            issuedCopies: { $sum: { $cond: [{ $eq: ['$status', 'ISSUED'] }, 1, 0] } },
            lostCopies: { $sum: { $cond: [{ $eq: ['$status', 'LOST'] }, 1, 0] } },
            damagedCopies: { $sum: { $cond: [{ $eq: ['$status', 'DAMAGED'] }, 1, 0] } },
          },
        },
      ]),
      LibraryIssue.aggregate([
        { $match: { schoolId: schoolObjId } },
        {
          $group: {
            _id: null,
            totalIssues: { $sum: 1 },
            activeIssued: {
              $sum: { $cond: [{ $eq: ['$status', 'ISSUED'] }, 1, 0] },
            },
            overdueCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'ISSUED'] },
                      { $lt: ['$dueDate', new Date()] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalFinesCollected: {
              $sum: {
                $cond: [{ $eq: ['$fineStatus', 'PAID'] }, '$fineAmount', 0],
              },
            },
            totalPendingFines: {
              $sum: {
                $cond: [{ $eq: ['$fineStatus', 'PENDING'] }, '$fineAmount', 0],
              },
            },
          },
        },
      ]),
      LibraryIssue.aggregate([
        { $match: { schoolId: schoolObjId } },
        {
          $group: {
            _id: null,
            todayIssues: {
              $sum: {
                $cond: [{ $gte: ['$issueDate', todayStart] }, 1, 0],
              },
            },
            todayReturns: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$status', 'RETURNED'] },
                      { $gte: ['$returnDate', todayStart] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            todayFineCollected: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$fineStatus', 'PAID'] },
                      { $gte: ['$returnDate', todayStart] },
                    ],
                  },
                  '$fineAmount',
                  0,
                ],
              },
            },
          },
        },
      ]),
      LibraryReservation.countDocuments({ schoolId: schoolObjId, status: 'PENDING' }),
    ]);

    const b = bookAgg[0] || {};
    const c = copyAgg[0] || {};
    const i = issueAgg[0] || {};
    const t = todayAgg[0] || {};

    return {
      totalTitles: b.totalTitles || 0,
      totalCopies: c.totalCopies || 0,
      availableCopies: c.availableCopies || 0,
      issuedCopies: c.issuedCopies || i.activeIssued || 0,
      lostCopies: c.lostCopies || 0,
      damagedCopies: c.damagedCopies || 0,
      totalIssues: i.totalIssues || 0,
      activeIssued: i.activeIssued || 0,
      overdueCount: i.overdueCount || 0,
      totalFinesCollected: i.totalFinesCollected || 0,
      totalPendingFines: i.totalPendingFines || 0,
      todayIssues: t.todayIssues || 0,
      todayReturns: t.todayReturns || 0,
      todayFineCollected: t.todayFineCollected || 0,
      pendingReservations: reservationPending || 0,
    };
  }

  // Eligible Borrowers list (Students & Teachers & Staff)
  async getEligibleBorrowers(schoolId) {
    const schoolObjId = toObjectId(schoolId);

    const [students, teachers, staff] = await Promise.all([
      Student.find({ schoolId: schoolObjId, status: 'ACTIVE' })
        .select('_id admissionNumber enrollmentId firstName lastName rollNumber')
        .sort({ firstName: 1, lastName: 1 })
        .lean(),
      Teacher.find({ schoolId: schoolObjId, status: 'ACTIVE' })
        .select('_id employeeId name firstName lastName department designation')
        .sort({ name: 1 })
        .lean(),
      SchoolUser.find({ schoolId: schoolObjId, status: 'ACTIVE' })
        .select('_id employeeId name firstName lastName email role department designation')
        .sort({ name: 1 })
        .lean(),
    ]);

    // Batch populate active student enrollment class & section
    const studentIds = (students || []).map((s) => s._id);
    const enrollments = studentIds.length
      ? await StudentEnrollment.find({
          schoolId: schoolObjId,
          studentId: { $in: studentIds },
          status: 'ACTIVE',
        })
          .populate('classId', 'name')
          .populate('sectionId', 'name')
          .lean()
      : [];

    const enrollmentMap = {};
    for (const enr of enrollments) {
      const className = enr.classId?.name || '';
      const sectionName = enr.sectionId?.name || '';
      const classDisplay = [className, sectionName].filter(Boolean).join(' - ');
      enrollmentMap[enr.studentId.toString()] = {
        classDisplay: classDisplay || (enr.rollNumber ? `Roll #${enr.rollNumber}` : 'Student'),
        rollNumber: enr.rollNumber,
      };
    }

    const formattedStudents = (students || []).map((s) => {
      const enr = enrollmentMap[s._id.toString()];
      return {
        id: s._id.toString(),
        type: 'STUDENT',
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
        code: s.admissionNumber || s.enrollmentId || 'STU',
        class: enr?.classDisplay || (s.rollNumber ? `Roll #${s.rollNumber}` : 'Student'),
      };
    });

    const formattedTeachers = (teachers || []).map((t) => {
      const fullName = t.name || `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Teacher';
      return {
        id: t._id.toString(),
        type: 'TEACHER',
        name: fullName,
        code: t.employeeId || 'TCH',
        class: t.designation || t.department || 'Faculty',
      };
    });

    const teacherEmployeeIds = new Set(formattedTeachers.map((t) => t.code).filter(Boolean));
    const formattedStaff = (staff || [])
      .filter((st) => !teacherEmployeeIds.has(st.employeeId))
      .map((st) => ({
        id: st._id.toString(),
        type: st.role === 'TEACHER' ? 'TEACHER' : 'STAFF',
        name: st.name || `${st.firstName || ''} ${st.lastName || ''}`.trim() || 'Staff',
        code: st.employeeId || 'STAFF',
        class: st.designation || st.department || st.role || 'Staff',
      }));

    return [...formattedStudents, ...formattedTeachers, ...formattedStaff];
  }

  // Per-book circulation & stock utilization
  async getBookUsageReport(schoolId, { category } = {}) {
    const schoolObjId = toObjectId(schoolId);
    const match = { schoolId: schoolObjId };
    if (category && category !== 'ALL') match.category = category;

    return LibraryBook.aggregate([
      { $match: match },
      { $lookup: { from: 'libraryissues', localField: '_id', foreignField: 'bookId', as: 'issues' } },
      { $lookup: { from: 'bookcopies', localField: '_id', foreignField: 'bookId', as: 'copies' } },
      {
        $project: {
          title: 1,
          author: 1,
          category: 1,
          totalCopies: { $size: '$copies' },
          availableCopies: {
            $size: { $filter: { input: '$copies', as: 'c', cond: { $eq: ['$$c.status', 'AVAILABLE'] } } },
          },
          totalIssues: { $size: '$issues' },
          currentlyIssued: {
            $size: { $filter: { input: '$issues', as: 'i', cond: { $eq: ['$$i.status', 'ISSUED'] } } },
          },
        },
      },
      { $sort: { totalIssues: -1 } },
    ]);
  }

  // Books returned in DAMAGED / LOST condition
  async getLostDamagedReport(schoolId) {
    const schoolObjId = toObjectId(schoolId);
    return LibraryIssue.find({
      schoolId: schoolObjId,
      conditionOnReturn: { $in: ['DAMAGED', 'LOST'] },
    })
      .sort({ returnDate: -1 })
      .lean();
  }
}

export const libraryRepository = new LibraryRepository();
