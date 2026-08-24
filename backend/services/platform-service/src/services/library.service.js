import { AppError } from '../../../shared/AppError.js';
import { libraryRepository } from '../repositories/library.repository.js';
import { librarySettingsRepository } from '../repositories/librarySettings.repository.js';
import { bookCopyRepository } from '../repositories/bookCopy.repository.js';
import { libraryReservationRepository } from '../repositories/libraryReservation.repository.js';
import { libraryTransactionRepository } from '../repositories/libraryTransaction.repository.js';
import { libraryCategoryRepository } from '../repositories/libraryCategory.repository.js';

const DEFAULT_LIBRARY_CATEGORIES = [
  'Science',
  'Mathematics',
  'Literature',
  'History',
  'Technology',
  'Fiction',
  'Biography',
  'Self-Help',
  'Textbook',
  'General',
];

function ensureStatus(value) {
  const status = (value || '').toUpperCase();
  if (status !== 'ACTIVE' && status !== 'INACTIVE') {
    throw new AppError('Status must be either ACTIVE or INACTIVE', 400);
  }
  return status;
}

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  return text;
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

class LibraryService {
  // Settings
  async getSettings(schoolId) {
    const settings = await librarySettingsRepository.getSettings(schoolId);
    return settings.toPublicJSON();
  }

  async updateSettings(schoolId, payload = {}) {
    const updates = {};
    // Issue Rules
    if (payload.maxBooksStudent !== undefined) updates.maxBooksStudent = Math.max(1, Number(payload.maxBooksStudent) || 3);
    if (payload.maxBooksTeacher !== undefined) updates.maxBooksTeacher = Math.max(1, Number(payload.maxBooksTeacher) || 5);
    if (payload.issueDaysStudent !== undefined) updates.issueDaysStudent = Math.max(1, Number(payload.issueDaysStudent) || 14);
    if (payload.issueDaysTeacher !== undefined) updates.issueDaysTeacher = Math.max(1, Number(payload.issueDaysTeacher) || 30);

    // Fine Rules
    if (payload.fineEnabled !== undefined) updates.fineEnabled = Boolean(payload.fineEnabled);
    if (payload.finePerDay !== undefined) updates.finePerDay = Math.max(0, Number(payload.finePerDay) || 0);
    if (payload.maxFineAmount !== undefined) updates.maxFineAmount = Math.max(0, Number(payload.maxFineAmount) || 0);

    // Renewal Rules
    if (payload.allowRenewal !== undefined) updates.allowRenewal = Boolean(payload.allowRenewal);
    if (payload.maxRenewals !== undefined) updates.maxRenewals = Math.max(0, Number(payload.maxRenewals) || 0);
    if (payload.renewalPeriodDays !== undefined) updates.renewalPeriodDays = Math.max(1, Number(payload.renewalPeriodDays) || 14);

    // Return Rules
    if (payload.gracePeriodDays !== undefined) updates.gracePeriodDays = Math.max(0, Number(payload.gracePeriodDays) || 0);
    if (payload.blockIssueOnOverdue !== undefined) updates.blockIssueOnOverdue = Boolean(payload.blockIssueOnOverdue);

    // Lost / Damaged Charges
    if (payload.lostBookFineMultiplier !== undefined) updates.lostBookFineMultiplier = Math.max(0, Number(payload.lostBookFineMultiplier) || 0);
    if (payload.damagedBookFineMultiplier !== undefined) updates.damagedBookFineMultiplier = Math.max(0, Number(payload.damagedBookFineMultiplier) || 0);

    // Reservation Rules
    if (payload.reservationEnabled !== undefined) updates.reservationEnabled = Boolean(payload.reservationEnabled);
    if (payload.maxActiveReservations !== undefined) updates.maxActiveReservations = Math.max(1, Number(payload.maxActiveReservations) || 2);

    const updated = await librarySettingsRepository.updateSettings(schoolId, updates);
    return updated.toPublicJSON();
  }

  // Dashboard Stats
  async getStats(schoolId) {
    return libraryRepository.getLibraryStats(schoolId);
  }

  // Books CRUD
  async listBooks(schoolId, query = {}) {
    return libraryRepository.listBooks(schoolId, query);
  }

  async getBook(schoolId, id) {
    const res = await libraryRepository.findBookById(schoolId, id);
    if (!res || !res.book) throw new AppError('Library book not found', 404);
    return res.book.toPublicJSON(res.stats);
  }

  async createBook(schoolId, payload = {}) {
    const title = requireText(payload.title, 'Book title');
    const author = requireText(payload.author, 'Author');
    const category = optionalText(payload.category) || 'GENERAL';
    const totalCopies = Math.max(1, Number(payload.totalCopies) || 1);

    const book = await libraryRepository.createBook({
      schoolId,
      title,
      author,
      isbn: optionalText(payload.isbn),
      bookCode: optionalText(payload.bookCode),
      category: category.toUpperCase(),
      subject: optionalText(payload.subject),
      publisher: optionalText(payload.publisher),
      edition: optionalText(payload.edition),
      publicationYear: Number(payload.publicationYear) || null,
      language: optionalText(payload.language) || 'English',
      pages: Math.max(0, Number(payload.pages) || 0),
      coverImage: optionalText(payload.coverImage),
      rackNumber: optionalText(payload.rackNumber),
      shelfNumber: optionalText(payload.shelfNumber),
      totalCopies,
      availableCopies: totalCopies,
      price: Math.max(0, Number(payload.price) || 0),
      description: optionalText(payload.description),
      status: 'AVAILABLE',
    });

    return book.toPublicJSON();
  }

  async updateBook(schoolId, id, payload = {}) {
    const res = await libraryRepository.findBookById(schoolId, id);
    if (!res || !res.book) throw new AppError('Library book not found', 404);

    const updates = {};
    if (payload.title) updates.title = payload.title.trim();
    if (payload.author) updates.author = payload.author.trim();
    if (payload.isbn !== undefined) updates.isbn = optionalText(payload.isbn);
    if (payload.bookCode !== undefined) updates.bookCode = optionalText(payload.bookCode);
    if (payload.category) updates.category = payload.category.trim().toUpperCase();
    if (payload.subject !== undefined) updates.subject = optionalText(payload.subject);
    if (payload.publisher !== undefined) updates.publisher = optionalText(payload.publisher);
    if (payload.edition !== undefined) updates.edition = optionalText(payload.edition);
    if (payload.publicationYear !== undefined) updates.publicationYear = Number(payload.publicationYear) || null;
    if (payload.language !== undefined) updates.language = optionalText(payload.language);
    if (payload.pages !== undefined) updates.pages = Math.max(0, Number(payload.pages) || 0);
    if (payload.coverImage !== undefined) updates.coverImage = optionalText(payload.coverImage);
    if (payload.rackNumber !== undefined) updates.rackNumber = optionalText(payload.rackNumber);
    if (payload.shelfNumber !== undefined) updates.shelfNumber = optionalText(payload.shelfNumber);
    if (payload.price !== undefined) updates.price = Math.max(0, Number(payload.price) || 0);
    if (payload.description !== undefined) updates.description = optionalText(payload.description);
    if (payload.isActive !== undefined) updates.isActive = Boolean(payload.isActive);

    const updated = await libraryRepository.updateBook(schoolId, id, updates);
    return updated;
  }

  async deleteBook(schoolId, id) {
    const res = await libraryRepository.findBookById(schoolId, id);
    if (!res || !res.book) throw new AppError('Library book not found', 404);

    // Strict Rule: Block delete if active issues or pending reservations exist
    const activeIssues = await libraryRepository.listIssues(schoolId, { bookId: id, status: 'ISSUED' });
    if (activeIssues.total > 0) {
      throw new AppError(`Cannot delete book: ${activeIssues.total} copy/copies are currently issued to borrowers.`, 400);
    }

    const pendingRes = await libraryReservationRepository.listReservations(schoolId, { bookId: id, status: 'PENDING' });
    if (pendingRes.total > 0) {
      throw new AppError(`Cannot delete book: There are ${pendingRes.total} pending reservation(s) for this book.`, 400);
    }

    await libraryRepository.deleteBook(schoolId, id);
    return { message: 'Library book and copies deleted successfully' };
  }

  // Categories CRUD (active/inactive managed entities, book stats merged in)
  async getCategories(schoolId) {
    let categories = await libraryCategoryRepository.listCategories(schoolId);
    const statsMap = await libraryCategoryRepository.getBookStatsByCategory(schoolId);

    // Seed the default catalogue set the very first time a school has no categories
    // and no books either, so the "Add Book" dropdown isn't empty on day one.
    if (categories.length === 0 && Object.keys(statsMap).length === 0) {
      for (const name of DEFAULT_LIBRARY_CATEGORIES) {
        await libraryCategoryRepository.createCategory({ schoolId, name, status: 'ACTIVE' });
      }
      categories = await libraryCategoryRepository.listCategories(schoolId);
    }

    // Auto-adopt any legacy free-text book category that doesn't have a managed entity yet
    const existingNames = new Set(categories.map((c) => c.name.toUpperCase()));
    const orphanNames = Object.keys(statsMap).filter((name) => name && !existingNames.has(name));
    if (orphanNames.length > 0) {
      for (const name of orphanNames) {
        await libraryCategoryRepository.createCategory({ schoolId, name, status: 'ACTIVE' });
      }
      categories = await libraryCategoryRepository.listCategories(schoolId);
    }

    return categories
      .map((cat) => cat.toPublicJSON(statsMap[cat.name.toUpperCase()]))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async createCategory(schoolId, payload = {}) {
    const name = requireText(payload.name, 'Category name');
    const existing = await libraryCategoryRepository.findByName(schoolId, name);
    if (existing) throw new AppError('A category with this name already exists', 409);

    const status = payload.status !== undefined ? ensureStatus(payload.status) : 'ACTIVE';
    const created = await libraryCategoryRepository.createCategory({
      schoolId,
      name,
      description: optionalText(payload.description),
      status,
    });
    return created.toPublicJSON();
  }

  async updateCategory(schoolId, id, payload = {}) {
    const category = await libraryCategoryRepository.findById(schoolId, id);
    if (!category) throw new AppError('Category not found', 404);

    const updates = {};
    if (payload.name !== undefined) {
      const name = requireText(payload.name, 'Category name');
      const existing = await libraryCategoryRepository.findByName(schoolId, name, id);
      if (existing) throw new AppError('A category with this name already exists', 409);
      updates.name = name;
    }
    if (payload.description !== undefined) updates.description = optionalText(payload.description);
    if (payload.status !== undefined) updates.status = ensureStatus(payload.status);

    const updated = await libraryCategoryRepository.updateCategory(schoolId, id, updates);

    // Keep existing catalogued books in sync when a category is renamed
    if (updates.name && updates.name.toUpperCase() !== category.name.toUpperCase()) {
      await libraryCategoryRepository.renameBooksCategory(schoolId, category.name, updates.name);
    }

    const statsMap = await libraryCategoryRepository.getBookStatsByCategory(schoolId);
    return updated.toPublicJSON(statsMap[updated.name.toUpperCase()]);
  }

  async deleteCategory(schoolId, id) {
    const category = await libraryCategoryRepository.findById(schoolId, id);
    if (!category) throw new AppError('Category not found', 404);

    const statsMap = await libraryCategoryRepository.getBookStatsByCategory(schoolId);
    const stats = statsMap[category.name.toUpperCase()];
    if (stats && stats.count > 0) {
      throw new AppError(
        `Cannot delete category: ${stats.count} book(s) are currently tagged under "${category.name}". Deactivate it instead, or reassign those books first.`,
        400
      );
    }

    await libraryCategoryRepository.deleteCategory(schoolId, id);
    return { message: 'Category deleted successfully' };
  }

  async getAuthors(schoolId) {
    return libraryRepository.getAuthors(schoolId);
  }

  async getPublishers(schoolId) {
    return libraryRepository.getPublishers(schoolId);
  }

  // Physical Book Copies
  async listCopies(schoolId, query = {}) {
    const result = await bookCopyRepository.listCopies(schoolId, query);
    return {
      data: result.items.map((c) => c.toPublicJSON()),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  }

  async createCopy(schoolId, payload = {}) {
    const bookId = requireText(payload.bookId, 'Parent Book ID');
    const bookRes = await libraryRepository.findBookById(schoolId, bookId);
    if (!bookRes || !bookRes.book) throw new AppError('Book catalog entry not found', 404);

    let accessionNumber = optionalText(payload.accessionNumber);
    if (!accessionNumber) {
      const shortId = bookId.slice(-4).toUpperCase();
      const prefix = (bookRes.book.category ? bookRes.book.category.slice(0, 3) : 'BK').toUpperCase();
      const timestamp = Date.now().toString().slice(-4);
      accessionNumber = `ACC-${prefix}-${shortId}-${timestamp}`;
    }

    const existing = await bookCopyRepository.findByAccessionNumber(schoolId, accessionNumber);
    if (existing) {
      throw new AppError(`Accession number "${accessionNumber}" already exists in this school library.`, 400);
    }

    const copy = await bookCopyRepository.createCopy({
      schoolId,
      bookId,
      accessionNumber,
      barcode: optionalText(payload.barcode) || accessionNumber,
      rackNumber: optionalText(payload.rackNumber) || bookRes.book.rackNumber || '',
      shelfNumber: optionalText(payload.shelfNumber) || bookRes.book.shelfNumber || '',
      condition: (payload.condition || 'GOOD').toUpperCase(),
      status: 'AVAILABLE',
      price: payload.price !== undefined ? Math.max(0, Number(payload.price)) : bookRes.book.price,
      remarks: optionalText(payload.remarks),
    });

    return copy.toPublicJSON();
  }

  async updateCopy(schoolId, id, payload = {}) {
    const copy = await bookCopyRepository.findCopyById(schoolId, id);
    if (!copy) throw new AppError('Book copy not found', 404);

    const updates = {};
    if (payload.accessionNumber && payload.accessionNumber !== copy.accessionNumber) {
      const existing = await bookCopyRepository.findByAccessionNumber(schoolId, payload.accessionNumber);
      if (existing) throw new AppError(`Accession number "${payload.accessionNumber}" already in use.`, 400);
      updates.accessionNumber = payload.accessionNumber.trim();
    }
    if (payload.barcode !== undefined) updates.barcode = optionalText(payload.barcode);
    if (payload.rackNumber !== undefined) updates.rackNumber = optionalText(payload.rackNumber);
    if (payload.shelfNumber !== undefined) updates.shelfNumber = optionalText(payload.shelfNumber);
    if (payload.condition) updates.condition = payload.condition.toUpperCase();
    if (payload.status) {
      if (copy.status === 'ISSUED' && payload.status !== 'ISSUED') {
        throw new AppError('Cannot manually change status of an actively issued copy. Return the book first.', 400);
      }
      updates.status = payload.status.toUpperCase();
    }
    if (payload.price !== undefined) updates.price = Math.max(0, Number(payload.price) || 0);
    if (payload.remarks !== undefined) updates.remarks = optionalText(payload.remarks);

    const updated = await bookCopyRepository.updateCopy(schoolId, id, updates);
    return updated.toPublicJSON();
  }

  async deleteCopy(schoolId, id) {
    const copy = await bookCopyRepository.findCopyById(schoolId, id);
    if (!copy) throw new AppError('Book copy not found', 404);

    if (copy.status === 'ISSUED') {
      throw new AppError('Cannot delete a physical copy while it is currently issued to a borrower.', 400);
    }

    await bookCopyRepository.deleteCopy(schoolId, id);
    return { message: 'Physical copy deleted successfully' };
  }

  // Issues & Circulation
  async listIssues(schoolId, query = {}) {
    const result = await libraryRepository.listIssues(schoolId, query);
    return {
      data: result.items.map((i) => i.toPublicJSON()),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  }

  async issueBook(schoolId, payload = {}, performedBy = 'Librarian') {
    const bookId = requireText(payload.bookId, 'Book');
    const borrowerRefId = requireText(payload.borrowerRefId, 'Borrower selection');
    const borrowerType = (payload.borrowerType || 'STUDENT').toUpperCase();

    // 1. Fetch school library settings
    const settings = await librarySettingsRepository.getSettings(schoolId);

    // 2. Verify book availability
    const bookRes = await libraryRepository.findBookById(schoolId, bookId);
    if (!bookRes || !bookRes.book) throw new AppError('Selected book not found in catalog', 404);

    // 3. Find physical copy to issue
    let selectedCopy = null;
    if (payload.copyId) {
      selectedCopy = await bookCopyRepository.findCopyById(schoolId, payload.copyId);
      if (!selectedCopy || selectedCopy.status !== 'AVAILABLE') {
        throw new AppError('The selected physical copy is not available for issue.', 400);
      }
    } else {
      // Pick first available copy
      const availableCopies = await bookCopyRepository.listCopies(schoolId, { bookId, status: 'AVAILABLE', limit: 1 });
      if (!availableCopies.items.length) {
        throw new AppError(`No available physical copies for "${bookRes.book.title}". All copies are currently issued or reserved.`, 400);
      }
      selectedCopy = availableCopies.items[0];
    }

    // 4. Check borrower active unreturned issues vs settings limit
    const activeBorrowerIssues = await libraryRepository.listIssues(schoolId, {
      borrowerRefId,
      status: 'ISSUED',
    });

    const maxAllowed = borrowerType === 'TEACHER' ? (settings.maxBooksTeacher || 5) : (settings.maxBooksStudent || 3);
    if (activeBorrowerIssues.total >= maxAllowed) {
      throw new AppError(
        `Borrower already has ${activeBorrowerIssues.total} unreturned books (Limit: ${maxAllowed}). Please return an earlier book first.`,
        400
      );
    }

    // 4b. Block new issues if borrower has any overdue books (policy-controlled)
    if (settings.blockIssueOnOverdue) {
      const overdueIssues = await libraryRepository.listIssues(schoolId, {
        borrowerRefId,
        status: 'OVERDUE',
      });
      if (overdueIssues.total > 0) {
        throw new AppError(
          `Cannot issue a new book: borrower has ${overdueIssues.total} overdue book(s). Please return or clear overdue items first.`,
          400
        );
      }
    }

    // 5. Due Date calculation
    const issueDate = payload.issueDate ? new Date(payload.issueDate) : new Date();
    const defaultDurationDays = borrowerType === 'TEACHER' ? (settings.issueDaysTeacher || 30) : (settings.issueDaysStudent || 14);
    const durationDays = Number(payload.durationDays) || defaultDurationDays;
    let dueDate = payload.dueDate ? new Date(payload.dueDate) : null;
    if (!dueDate || isNaN(dueDate.getTime())) {
      dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + durationDays);
    }

    const issue = await libraryRepository.createIssue({
      schoolId,
      bookId,
      copyId: selectedCopy._id,
      bookTitle: bookRes.book.title,
      bookCode: bookRes.book.bookCode || `BK-${bookRes.book._id.toString().slice(-4).toUpperCase()}`,
      accessionNumber: selectedCopy.accessionNumber,
      borrowerType,
      borrowerRefId,
      borrowerName: requireText(payload.borrowerName, 'Borrower name'),
      borrowerCode: optionalText(payload.borrowerCode),
      borrowerClass: optionalText(payload.borrowerClass),
      issueDate,
      dueDate,
      maxRenewals: settings.maxRenewals ?? 2,
      status: 'ISSUED',
      remarks: optionalText(payload.remarks),
    }, performedBy);

    return issue.toPublicJSON();
  }

  async returnBook(schoolId, issueId, payload = {}, performedBy = 'Librarian') {
    const issue = await libraryRepository.findIssueById(schoolId, issueId);
    if (!issue) throw new AppError('Library loan record not found', 404);
    if (issue.status === 'RETURNED') {
      throw new AppError('This book has already been returned', 400);
    }

    const settings = await librarySettingsRepository.getSettings(schoolId);
    const returnDate = payload.returnDate ? new Date(payload.returnDate) : new Date();
    const conditionOnReturn = payload.conditionOnReturn || 'GOOD';

    // Fine is always computed server-side from library rules — never trusted from the
    // request body, otherwise a client could submit fineAmount: 0 to bypass it.
    let fineAmount;
    if (conditionOnReturn === 'LOST' || conditionOnReturn === 'DAMAGED') {
      // Replacement/damage charge, calculated off the book's catalog price
      const bookPrice = Number(issue.bookId?.price) || 0;
      const multiplier = conditionOnReturn === 'LOST'
        ? (settings.lostBookFineMultiplier ?? 1.5)
        : (settings.damagedBookFineMultiplier ?? 0.5);
      fineAmount = Math.round(bookPrice * multiplier);
    } else if (!settings.fineEnabled) {
      fineAmount = 0;
    } else {
      // Calculate overdue fine from DB settings
      const dueDate = new Date(issue.dueDate);
      const graceDays = settings.gracePeriodDays || 0;
      const effectiveDueDate = new Date(dueDate.getTime() + graceDays * 24 * 60 * 60 * 1000);

      if (returnDate > effectiveDueDate) {
        const diffTime = Math.max(0, returnDate - dueDate);
        const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const calculatedFine = overdueDays * (settings.finePerDay ?? 5);
        fineAmount = Math.min(calculatedFine, settings.maxFineAmount ?? 500);
      } else {
        fineAmount = 0;
      }
    }

    const fineStatus = fineAmount > 0 ? (payload.fineStatus || 'PAID') : 'NONE';

    const updated = await libraryRepository.returnIssue(schoolId, issueId, {
      returnDate,
      fineAmount,
      fineStatus,
      conditionOnReturn,
      remarks: payload.remarks,
    }, performedBy);

    if (!updated) {
      throw new AppError('This book has already been returned', 409);
    }

    return updated.toPublicJSON();
  }

  async renewBook(schoolId, issueId, payload = {}, performedBy = 'Librarian') {
    const issue = await libraryRepository.findIssueById(schoolId, issueId);
    if (!issue) throw new AppError('Loan record not found', 404);
    if (issue.status === 'RETURNED') throw new AppError('Cannot renew an already returned book', 400);

    const settings = await librarySettingsRepository.getSettings(schoolId);
    if (!settings.allowRenewal) {
      throw new AppError('Book renewal is currently disabled by library policy.', 400);
    }

    const maxRenewals = issue.maxRenewals !== undefined ? issue.maxRenewals : (settings.maxRenewals ?? 2);
    if ((issue.renewalCount || 0) >= maxRenewals) {
      throw new AppError(`Maximum renewal limit (${maxRenewals}) reached for this book issue. Please return the book.`, 400);
    }

    const extendDays = Number(payload.durationDays) > 0 ? Number(payload.durationDays) : (settings.renewalPeriodDays || 14);
    const updated = await libraryRepository.renewIssue(schoolId, issueId, extendDays, performedBy);
    return updated.toPublicJSON();
  }

  async updateFineStatus(schoolId, issueId, fineStatus) {
    const status = (fineStatus || '').toUpperCase();
    if (!['PAID', 'WAIVED'].includes(status)) {
      throw new AppError('Fine status must be PAID or WAIVED', 400);
    }

    const issue = await libraryRepository.findIssueById(schoolId, issueId);
    if (!issue) throw new AppError('Library loan record not found', 404);
    if (!issue.fineAmount || issue.fineAmount <= 0) {
      throw new AppError('This loan record has no fine amount to settle', 400);
    }
    if (issue.fineStatus !== 'PENDING') {
      throw new AppError(`Cannot update fine status: it is already "${issue.fineStatus}".`, 400);
    }

    const updated = await libraryRepository.updateFineStatus(schoolId, issueId, status);
    return updated.toPublicJSON();
  }

  // Reservations
  async listReservations(schoolId, query = {}) {
    const result = await libraryReservationRepository.listReservations(schoolId, query);
    return {
      data: result.items.map((r) => r.toPublicJSON()),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  }

  async createReservation(schoolId, payload = {}, createdBy = 'Librarian') {
    const bookId = requireText(payload.bookId, 'Book');
    const borrowerRefId = requireText(payload.borrowerRefId, 'Borrower ID');

    const settings = await librarySettingsRepository.getSettings(schoolId);
    if (!settings.reservationEnabled) {
      throw new AppError('Book reservations are currently disabled by library policy.', 400);
    }

    const bookRes = await libraryRepository.findBookById(schoolId, bookId);
    if (!bookRes || !bookRes.book) throw new AppError('Selected book not found', 404);

    const existingPending = await libraryReservationRepository.listReservations(schoolId, {
      bookId,
      borrowerRefId,
      status: 'PENDING',
    });
    if (existingPending.total > 0) {
      throw new AppError('This borrower already has an active pending reservation for this book.', 400);
    }

    // Enforce the school's cap on how many reservations one borrower can hold at once
    // (PENDING + APPROVED count as "active" — only FULFILLED/REJECTED/CANCELLED don't).
    const maxActive = settings.maxActiveReservations || 2;
    const [activePending, activeApproved] = await Promise.all([
      libraryReservationRepository.listReservations(schoolId, { borrowerRefId, status: 'PENDING' }),
      libraryReservationRepository.listReservations(schoolId, { borrowerRefId, status: 'APPROVED' }),
    ]);
    const activeCount = activePending.total + activeApproved.total;
    if (activeCount >= maxActive) {
      throw new AppError(
        `Borrower already has ${activeCount} active reservation(s) (Limit: ${maxActive}). Please cancel or fulfill an earlier reservation first.`,
        400
      );
    }

    const reservation = await libraryReservationRepository.createReservation({
      schoolId,
      bookId,
      borrowerRefId,
      borrowerType: (payload.borrowerType || 'STUDENT').toUpperCase(),
      borrowerName: requireText(payload.borrowerName, 'Borrower name'),
      borrowerCode: optionalText(payload.borrowerCode),
      borrowerClass: optionalText(payload.borrowerClass),
      status: 'PENDING',
      createdBy,
      remarks: optionalText(payload.remarks),
    });

    return reservation.toPublicJSON();
  }

  async approveReservation(schoolId, id, performedBy = 'Librarian') {
    const reservation = await libraryReservationRepository.findById(schoolId, id);
    if (!reservation) throw new AppError('Reservation request not found', 404);
    if (reservation.status !== 'PENDING') {
      throw new AppError(`Cannot approve reservation with status "${reservation.status}". Only PENDING reservations can be approved.`, 400);
    }

    // Atomically claim and hold a specific copy for this reservation so it can't be issued
    // to anyone else — a plain read-then-write here would let two concurrent approvals for
    // the last copy both succeed.
    const bookId = reservation.bookId._id || reservation.bookId;
    const heldCopy = await bookCopyRepository.claimAvailableCopy(schoolId, bookId, 'RESERVED');

    if (!heldCopy) {
      throw new AppError(`Cannot approve reservation: No copies of "${reservation.bookId?.title || 'Book'}" are currently available in the library.`, 400);
    }

    const updated = await libraryReservationRepository.updateStatus(schoolId, id, 'APPROVED', {
      approvedAt: new Date(),
      copyId: heldCopy._id,
      remarks: `Approved by ${performedBy}`,
    }, 'PENDING');

    if (!updated) {
      // Reservation status changed concurrently (e.g. cancelled by the borrower) — release
      // the copy we just claimed instead of leaving it stuck RESERVED.
      await bookCopyRepository.updateCopy(schoolId, heldCopy._id, { status: 'AVAILABLE' });
      throw new AppError('This reservation was already updated by another request. Please refresh.', 409);
    }

    return updated.toPublicJSON();
  }

  async fulfillReservation(schoolId, id, payload = {}, performedBy = 'Librarian') {
    const reservation = await libraryReservationRepository.findById(schoolId, id);
    if (!reservation) throw new AppError('Reservation request not found', 404);
    if (reservation.status !== 'APPROVED') {
      throw new AppError(`Only approved reservations can be issued. Current status: "${reservation.status}".`, 400);
    }

    const bookId = reservation.bookId._id ? reservation.bookId._id.toString() : reservation.bookId.toString();
    const bookRes = await libraryRepository.findBookById(schoolId, bookId);
    if (!bookRes || !bookRes.book) throw new AppError('Reserved book no longer exists in the catalog', 404);

    // Use the copy that was held at approval time; fall back to any available copy if the hold was lost
    let selectedCopy = reservation.copyId
      ? await bookCopyRepository.findCopyById(schoolId, reservation.copyId)
      : null;
    if (!selectedCopy || selectedCopy.status !== 'RESERVED') {
      const availableCopies = await bookCopyRepository.listCopies(schoolId, { bookId, status: 'AVAILABLE', limit: 1 });
      if (!availableCopies.items.length) {
        throw new AppError(`No copies of "${bookRes.book.title}" are currently available to fulfill this reservation.`, 400);
      }
      selectedCopy = availableCopies.items[0];
    }

    const settings = await librarySettingsRepository.getSettings(schoolId);
    const issueDate = new Date();
    const defaultDurationDays = reservation.borrowerType === 'TEACHER' ? (settings.issueDaysTeacher || 30) : (settings.issueDaysStudent || 14);
    const durationDays = Number(payload.durationDays) || defaultDurationDays;
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + durationDays);

    const issue = await libraryRepository.createIssue({
      schoolId,
      bookId,
      copyId: selectedCopy._id,
      bookTitle: bookRes.book.title,
      bookCode: bookRes.book.bookCode || `BK-${bookRes.book._id.toString().slice(-4).toUpperCase()}`,
      accessionNumber: selectedCopy.accessionNumber,
      borrowerType: reservation.borrowerType,
      borrowerRefId: reservation.borrowerRefId,
      borrowerName: reservation.borrowerName,
      borrowerCode: reservation.borrowerCode,
      borrowerClass: reservation.borrowerClass,
      issueDate,
      dueDate,
      maxRenewals: settings.maxRenewals ?? 2,
      status: 'ISSUED',
      remarks: `Fulfilled from reservation ${reservation._id}`,
    }, performedBy);

    await libraryReservationRepository.updateStatus(schoolId, id, 'FULFILLED', {
      fulfilledAt: new Date(),
    });

    return issue.toPublicJSON();
  }

  async rejectReservation(schoolId, id, reason = '') {
    const reservation = await libraryReservationRepository.findById(schoolId, id);
    if (!reservation) throw new AppError('Reservation request not found', 404);
    if (reservation.status !== 'PENDING') {
      throw new AppError(`Cannot reject reservation with status "${reservation.status}".`, 400);
    }

    const updated = await libraryReservationRepository.updateStatus(schoolId, id, 'REJECTED', {
      remarks: reason || 'Rejected by Librarian',
    });

    return updated.toPublicJSON();
  }

  async cancelReservation(schoolId, id) {
    const reservation = await libraryReservationRepository.findById(schoolId, id);
    if (!reservation) throw new AppError('Reservation request not found', 404);
    if (reservation.status === 'FULFILLED' || reservation.status === 'CANCELLED') {
      throw new AppError(`Cannot cancel a reservation that is already ${reservation.status}.`, 400);
    }

    // Release the copy that was held for this reservation, if any
    if (reservation.copyId) {
      await bookCopyRepository.updateCopy(schoolId, reservation.copyId, { status: 'AVAILABLE' });
    }

    const updated = await libraryReservationRepository.updateStatus(schoolId, id, 'CANCELLED', {
      cancelledAt: new Date(),
    });

    return updated.toPublicJSON();
  }

  // Transactions Audit Log
  async listTransactions(schoolId, query = {}) {
    const result = await libraryTransactionRepository.listTransactions(schoolId, query);
    return {
      data: result.items.map((t) => t.toPublicJSON()),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit) || 1,
      },
    };
  }

  // Reports
  async getReportData(schoolId, category, query = {}) {
    switch (category) {
      case 'most-issued':
        return libraryTransactionRepository.getMostIssuedBooks(schoolId, Number(query.limit) || 10);
      case 'issue-trend':
        return libraryTransactionRepository.getIssueReturnTrend(schoolId, Number(query.months) || 6);
      case 'fine-trend':
        return libraryTransactionRepository.getFineTrend(schoolId, Number(query.months) || 6);
      case 'inventory': {
        const [categories, copiesStats] = await Promise.all([
          libraryRepository.getCategories(schoolId),
          libraryRepository.getLibraryStats(schoolId),
        ]);
        return { categories, stats: copiesStats };
      }
      case 'overdue':
        return libraryRepository.listIssues(schoolId, { status: 'OVERDUE', limit: 100 });
      case 'issues':
        return libraryRepository.listIssues(schoolId, { status: 'ALL', limit: 100 });
      case 'fines':
        return libraryRepository.listIssues(schoolId, { fineStatus: 'PAID', limit: 100 });
      case 'member-activity':
        return libraryTransactionRepository.getMemberActivityReport(schoolId, {
          limit: Number(query.limit) || 50,
          borrowerType: query.borrowerType,
          startDate: query.startDate,
          endDate: query.endDate,
        });
      case 'most-active-members':
        return libraryTransactionRepository.getMemberActivityReport(schoolId, { limit: Number(query.limit) || 10 });
      case 'book-usage':
        return libraryRepository.getBookUsageReport(schoolId, { category: query.category });
      case 'lost-damaged':
        return libraryRepository.getLostDamagedReport(schoolId);
      case 'period-trend':
        return libraryTransactionRepository.getPeriodTrend(schoolId, {
          granularity: query.granularity || 'daily',
          days: Number(query.days) || 30,
        });
      default:
        throw new AppError(`Unknown report category "${category}"`, 400);
    }
  }

  // Borrowers
  async getEligibleBorrowers(schoolId) {
    return libraryRepository.getEligibleBorrowers(schoolId);
  }

  // Notification recipients: students & teachers, tagged with their current
  // circulation status so the librarian can see who has a book issued/due/reserved.
  async getNotificationRecipients(schoolId) {
    const [borrowers, issuesRes, reservationsRes] = await Promise.all([
      libraryRepository.getEligibleBorrowers(schoolId),
      libraryRepository.listIssues(schoolId, { status: 'ISSUED', limit: 200 }),
      libraryReservationRepository.listReservations(schoolId, { limit: 200 }),
    ]);

    const tagsByBorrower = {};
    const addTag = (id, tag) => {
      if (!id) return;
      if (!tagsByBorrower[id]) tagsByBorrower[id] = new Set();
      tagsByBorrower[id].add(tag);
    };

    for (const issue of issuesRes.items) {
      const pub = issue.toPublicJSON();
      addTag(pub.borrowerRefId, pub.status === 'OVERDUE' ? 'Due' : 'Issued');
    }

    for (const reservation of reservationsRes.items) {
      const pub = reservation.toPublicJSON();
      if (pub.status === 'PENDING' || pub.status === 'APPROVED') {
        addTag(pub.borrowerRefId, 'Reserved');
      }
    }

    return borrowers
      .filter((b) => b.type === 'STUDENT' || b.type === 'TEACHER')
      .map((b) => ({
        ...b,
        tags: Array.from(tagsByBorrower[b.id] || []),
      }));
  }
}

export const libraryService = new LibraryService();
