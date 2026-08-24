import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { School } from './models/School.js';
import { Student } from './models/Student.js';
import { Teacher } from './models/Teacher.js';
import { LibraryBook } from './models/LibraryBook.js';
import { BookCopy } from './models/BookCopy.js';
import { LibrarySettings } from './models/LibrarySettings.js';
import { libraryRepository } from './repositories/library.repository.js';
import { libraryReservationRepository } from './repositories/libraryReservation.repository.js';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);
const daysFromNow = (n) => new Date(Date.now() + n * DAY);

const DEMO_STUDENTS = [
  { admissionNumber: 'LIB-STU-001', firstName: 'Ali', lastName: 'Raza', className: 'Class 9-A' },
  { admissionNumber: 'LIB-STU-002', firstName: 'Sara', lastName: 'Khan', className: 'Class 8-B' },
  { admissionNumber: 'LIB-STU-003', firstName: 'Bilal', lastName: 'Ahmed', className: 'Class 10-A' },
  { admissionNumber: 'LIB-STU-004', firstName: 'Ayesha', lastName: 'Siddiqui', className: 'Class 7-C' },
  { admissionNumber: 'LIB-STU-005', firstName: 'Hamza', lastName: 'Tariq', className: 'Class 9-B' },
  { admissionNumber: 'LIB-STU-006', firstName: 'Zainab', lastName: 'Fatima', className: 'Class 8-A' },
  { admissionNumber: 'LIB-STU-007', firstName: 'Usman', lastName: 'Ghani', className: 'Class 10-C' },
  { admissionNumber: 'LIB-STU-008', firstName: 'Mehak', lastName: 'Noor', className: 'Class 6-A' },
  { admissionNumber: 'LIB-STU-009', firstName: 'Faizan', lastName: 'Iqbal', className: 'Class 11-A' },
  { admissionNumber: 'LIB-STU-010', firstName: 'Rimsha', lastName: 'Aslam', className: 'Class 9-C' },
];

const DEMO_BOOKS = [
  { title: 'Bang-e-Dra', author: 'Allama Muhammad Iqbal', isbn: '978-969-1234-01-1', category: 'URDU LITERATURE', publisher: 'Sheikh Ghulam Ali & Sons', edition: '1st', publicationYear: 1924, language: 'Urdu', pages: 320, price: 450, totalCopies: 3, rackNumber: 'R-1', shelfNumber: 'S-1' },
  { title: 'Bostan', author: 'Sheikh Saadi Shirazi', isbn: '978-969-1234-02-8', category: 'URDU LITERATURE', publisher: 'Al-Faisal Publishers', edition: '3rd', publicationYear: 2010, language: 'Urdu', pages: 280, price: 380, totalCopies: 2, rackNumber: 'R-1', shelfNumber: 'S-2' },
  { title: "Harry Potter and the Philosopher's Stone", author: 'J.K. Rowling', isbn: '978-0-7475-3269-9', category: 'FICTION', publisher: 'Bloomsbury', edition: '1st', publicationYear: 1997, language: 'English', pages: 223, price: 650, totalCopies: 4, rackNumber: 'R-2', shelfNumber: 'S-1' },
  { title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '978-0-553-38016-3', category: 'SCIENCE', publisher: 'Bantam Books', edition: '10th Anniversary', publicationYear: 1998, language: 'English', pages: 212, price: 550, totalCopies: 2, rackNumber: 'R-3', shelfNumber: 'S-1' },
  { title: 'Introduction to Algorithms', author: 'Cormen, Leiserson, Rivest, Stein', isbn: '978-0-262-03384-8', category: 'COMPUTER SCIENCE', publisher: 'MIT Press', edition: '3rd', publicationYear: 2009, language: 'English', pages: 1312, price: 2200, totalCopies: 2, rackNumber: 'R-4', shelfNumber: 'S-1' },
  { title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', isbn: '978-81-7371-146-6', category: 'BIOGRAPHY', publisher: 'Universities Press', edition: '1st', publicationYear: 1999, language: 'English', pages: 180, price: 300, totalCopies: 3, rackNumber: 'R-2', shelfNumber: 'S-2' },
  { title: 'The Alchemist', author: 'Paulo Coelho', isbn: '978-0-06-231500-7', category: 'FICTION', publisher: 'HarperOne', edition: '25th Anniversary', publicationYear: 1988, language: 'English', pages: 208, price: 400, totalCopies: 3, rackNumber: 'R-2', shelfNumber: 'S-3' },
  { title: 'Freedom at Midnight', author: 'Larry Collins & Dominique Lapierre', isbn: '978-0-7434-1494-4', category: 'HISTORY', publisher: 'Vikas Publishing', edition: '2nd', publicationYear: 1975, language: 'English', pages: 464, price: 500, totalCopies: 3, rackNumber: 'R-5', shelfNumber: 'S-1' },
  { title: 'Atomic Habits', author: 'James Clear', isbn: '978-0-7352-1129-2', category: 'SELF-HELP', publisher: 'Penguin Random House', edition: '1st', publicationYear: 2018, language: 'English', pages: 320, price: 500, totalCopies: 3, rackNumber: 'R-6', shelfNumber: 'S-1' },
  { title: 'NCERT Physics Class 12', author: 'NCERT', isbn: '978-81-7450-635-9', category: 'TEXTBOOK', publisher: 'NCERT', edition: '2023', publicationYear: 2023, language: 'English', pages: 350, price: 150, totalCopies: 5, rackNumber: 'R-7', shelfNumber: 'S-1' },
];

async function upsertStudent(schoolId, demo) {
  return Student.findOneAndUpdate(
    { schoolId, admissionNumber: demo.admissionNumber },
    {
      $setOnInsert: {
        schoolId,
        admissionNumber: demo.admissionNumber,
        firstName: demo.firstName,
        lastName: demo.lastName,
        gender: 'OTHER',
        status: 'ACTIVE',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function ensureBook(schoolId, demo) {
  const existing = await LibraryBook.findOne({ schoolId, title: demo.title });
  if (existing) return existing;
  return libraryRepository.createBook({ schoolId, ...demo });
}

async function pickAvailableCopy(schoolId, bookId) {
  return BookCopy.findOne({ schoolId, bookId, status: 'AVAILABLE' }).sort({ accessionNumber: 1 });
}

async function issueTo(schoolId, book, copy, borrower, { issueDate, dueDate, maxRenewals = 2 }) {
  if (!copy) {
    throw new Error(`No available copy for "${book.title}" to issue to ${borrower.name}`);
  }
  return libraryRepository.createIssue(
    {
      schoolId,
      bookId: book._id,
      copyId: copy._id,
      bookTitle: book.title,
      bookCode: book.bookCode || '',
      accessionNumber: copy.accessionNumber,
      borrowerType: borrower.type,
      borrowerRefId: borrower.id,
      borrowerName: borrower.name,
      borrowerCode: borrower.code,
      borrowerClass: borrower.className,
      issueDate,
      dueDate,
      maxRenewals,
    },
    'Meenakshi Sundaram'
  );
}

export async function seedLibraryData() {
  const schools = await School.find({}).select('_id name');
  let schoolsSeeded = 0;

  for (const school of schools) {
    const schoolId = school._id;

    // Atomically claim this school so concurrent server instances/restarts
    // can never both run the demo-data scenarios for the same school.
    const claim = await LibrarySettings.findOneAndUpdate(
      { schoolId, demoDataSeeded: { $ne: true } },
      {
        $set: { demoDataSeeded: true },
        $setOnInsert: {
          maxBooksStudent: 3,
          maxBooksTeacher: 5,
          issueDaysStudent: 14,
          issueDaysTeacher: 30,
          fineEnabled: true,
          finePerDay: 5,
          maxFineAmount: 500,
          allowRenewal: true,
          maxRenewals: 2,
          renewalPeriodDays: 14,
          gracePeriodDays: 0,
          blockIssueOnOverdue: true,
          lostBookFineMultiplier: 1.5,
          damagedBookFineMultiplier: 0.5,
        },
      },
      { upsert: true, new: true }
    ).catch(() => null);

    if (!claim) continue; // another process already claimed/seeded this school

    try {
    // 1. Students (borrowers)
    const students = {};
    for (const demo of DEMO_STUDENTS) {
      const doc = await upsertStudent(schoolId, demo);
      students[demo.admissionNumber] = { doc, className: demo.className };
    }

    // 2. Teachers (already seeded by seedAcademicTeachers) - reuse if present
    const teachers = await Teacher.find({ schoolId }).limit(5);
    const teacher = teachers[0] || null;

    // 3. Books + physical copies
    const books = {};
    for (const demo of DEMO_BOOKS) {
      books[demo.title] = await ensureBook(schoolId, demo);
    }

    const borrower = (admissionNumber) => {
      const { doc, className } = students[admissionNumber];
      return {
        type: 'STUDENT',
        id: doc._id,
        name: `${doc.firstName} ${doc.lastName}`.trim(),
        code: doc.admissionNumber,
        className,
      };
    };

    // --- Scenario 1: Ali Raza currently has "Bang-e-Dra" and it's overdue ---
    {
      const book = books['Bang-e-Dra'];
      const copy = await pickAvailableCopy(schoolId, book._id);
      await issueTo(schoolId, book, copy, borrower('LIB-STU-001'), {
        issueDate: daysAgo(20),
        dueDate: daysAgo(6),
      });
    }

    // --- Scenario 2: Sara Khan currently has "The Alchemist", within due date ---
    {
      const book = books['The Alchemist'];
      const copy = await pickAvailableCopy(schoolId, book._id);
      await issueTo(schoolId, book, copy, borrower('LIB-STU-002'), {
        issueDate: daysAgo(5),
        dueDate: daysFromNow(9),
      });
    }

    // --- Scenario 3: Bilal Ahmed returned "Harry Potter..." late, fine already paid ---
    {
      const book = books["Harry Potter and the Philosopher's Stone"];
      const copy = await pickAvailableCopy(schoolId, book._id);
      const issue = await issueTo(schoolId, book, copy, borrower('LIB-STU-003'), {
        issueDate: daysAgo(30),
        dueDate: daysAgo(16),
      });
      await libraryRepository.returnIssue(
        schoolId,
        issue._id,
        { returnDate: daysAgo(10), fineAmount: 30, fineStatus: 'PAID', conditionOnReturn: 'GOOD' },
        'Meenakshi Sundaram'
      );
    }

    // --- Scenario 4: Ayesha Siddiqui currently has "Atomic Habits", within due date ---
    {
      const book = books['Atomic Habits'];
      const copy = await pickAvailableCopy(schoolId, book._id);
      await issueTo(schoolId, book, copy, borrower('LIB-STU-004'), {
        issueDate: daysAgo(3),
        dueDate: daysFromNow(11),
      });
    }

    // --- Scenario 5: Hamza Tariq returned "A Brief History of Time" late, fine still pending ---
    {
      const book = books['A Brief History of Time'];
      const copy = await pickAvailableCopy(schoolId, book._id);
      const issue = await issueTo(schoolId, book, copy, borrower('LIB-STU-005'), {
        issueDate: daysAgo(40),
        dueDate: daysAgo(26),
      });
      await libraryRepository.returnIssue(
        schoolId,
        issue._id,
        { returnDate: daysAgo(20), fineAmount: 30, fineStatus: 'PENDING', conditionOnReturn: 'GOOD' },
        'Meenakshi Sundaram'
      );
    }

    // --- Scenario 6: Usman Ghani has "Wings of Fire", already renewed once ---
    {
      const book = books['Wings of Fire'];
      const copy = await pickAvailableCopy(schoolId, book._id);
      const issue = await issueTo(schoolId, book, copy, borrower('LIB-STU-007'), {
        issueDate: daysAgo(24),
        dueDate: daysAgo(10),
      });
      await libraryRepository.renewIssue(schoolId, issue._id, 14, 'Meenakshi Sundaram');
    }

    // --- Scenario 7: Mehak Noor currently has "NCERT Physics Class 12", within due date ---
    {
      const book = books['NCERT Physics Class 12'];
      const copy = await pickAvailableCopy(schoolId, book._id);
      await issueTo(schoolId, book, copy, borrower('LIB-STU-008'), {
        issueDate: daysAgo(2),
        dueDate: daysFromNow(12),
      });
    }

    // --- Scenario 8: Faizan Iqbal lost "Introduction to Algorithms" ---
    {
      const book = books['Introduction to Algorithms'];
      const copy = await pickAvailableCopy(schoolId, book._id);
      const issue = await issueTo(schoolId, book, copy, borrower('LIB-STU-009'), {
        issueDate: daysAgo(60),
        dueDate: daysAgo(46),
      });
      await libraryRepository.returnIssue(
        schoolId,
        issue._id,
        { returnDate: daysAgo(15), fineAmount: 1800, fineStatus: 'PENDING', conditionOnReturn: 'LOST' },
        'Meenakshi Sundaram'
      );
    }

    // --- Scenario 9: Rimsha Aslam returned "Freedom at Midnight" damaged ---
    {
      const book = books['Freedom at Midnight'];
      const copy = await pickAvailableCopy(schoolId, book._id);
      const issue = await issueTo(schoolId, book, copy, borrower('LIB-STU-010'), {
        issueDate: daysAgo(15),
        dueDate: daysAgo(1),
      });
      await libraryRepository.returnIssue(
        schoolId,
        issue._id,
        { returnDate: daysAgo(1), fineAmount: 100, fineStatus: 'PAID', conditionOnReturn: 'DAMAGED' },
        'Meenakshi Sundaram'
      );
    }

    // --- Scenario 10 (optional): a teacher borrows a book ---
    if (teacher) {
      const book = books['Freedom at Midnight'];
      const copy = await pickAvailableCopy(schoolId, book._id);
      if (copy) {
        await issueTo(
          schoolId,
          book,
          copy,
          {
            type: 'TEACHER',
            id: teacher._id,
            name: teacher.name,
            code: teacher.employeeId,
            className: teacher.department || 'Faculty',
          },
          { issueDate: daysAgo(4), dueDate: daysFromNow(10) }
        );
      }
    }

    // --- Reservations ---
    // Zainab Fatima wants "Bang-e-Dra" but all copies may be issued/short -> pending reservation
    await libraryReservationRepository.createReservation({
      schoolId,
      bookId: books['Bang-e-Dra']._id,
      borrowerType: 'STUDENT',
      borrowerRefId: students['LIB-STU-006'].doc._id,
      borrowerName: `${students['LIB-STU-006'].doc.firstName} ${students['LIB-STU-006'].doc.lastName}`.trim(),
      borrowerCode: students['LIB-STU-006'].doc.admissionNumber,
      borrowerClass: students['LIB-STU-006'].className,
      status: 'PENDING',
      reservedAt: daysAgo(2),
      remarks: 'Waiting for a copy of Bang-e-Dra to be returned',
    });

    // Bilal Ahmed's reservation for "A Brief History of Time" already approved, waiting for pickup
    await libraryReservationRepository.createReservation({
      schoolId,
      bookId: books['A Brief History of Time']._id,
      borrowerType: 'STUDENT',
      borrowerRefId: students['LIB-STU-003'].doc._id,
      borrowerName: `${students['LIB-STU-003'].doc.firstName} ${students['LIB-STU-003'].doc.lastName}`.trim(),
      borrowerCode: students['LIB-STU-003'].doc.admissionNumber,
      borrowerClass: students['LIB-STU-003'].className,
      status: 'APPROVED',
      reservedAt: daysAgo(4),
      approvedAt: daysAgo(1),
      remarks: 'Approved, notify student to collect from counter',
    });

    schoolsSeeded += 1;
    } catch (error) {
      console.error(`Library demo seed failed for school ${school.name}:`, error.message);
    }
  }

  if (schoolsSeeded > 0) {
    console.log(`Library demo data seeded for ${schoolsSeeded} school(s): books, copies, members, issues, returns, fines, reservations`);
  }
  return schoolsSeeded;
}

const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('seedLibrary.js');

if (isDirectRun) {
  connectDB(env.mongoUri)
    .then(() => seedLibraryData())
    .then((count) => {
      console.log(`Done. Schools processed: ${count}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Library seed failed:', error);
      process.exit(1);
    });
}
