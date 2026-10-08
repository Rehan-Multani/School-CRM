import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { studentRepository } from '../repositories/student.repository.js';
import { studentService } from './student.service.js';
import { feeService } from './fee.service.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { FeeInvoice } from '../models/FeeInvoice.js';
import { School } from '../models/School.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { parseCsvObjects, toCsv } from '../utils/csv.js';

// Student lifecycle: year-end promotion, transfer / leaving (+TC), bulk CSV
// import. Kept apart from student.service.js on purpose — it only composes
// the repository and studentService.createStudent.

const LEAVING_TYPES = ['TRANSFERRED', 'WITHDRAWN'];
const UNPAID_STATUSES = ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'];

export const IMPORT_HEADERS = [
  'admissionNumber', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'className', 'sectionName',
  'rollNumber', 'parentName', 'parentPhone', 'email', 'phone', 'address',
];

const oid = (id) => new mongoose.Types.ObjectId(id);

function requireId(value, label) {
  if (!value || !mongoose.isValidObjectId(value)) throw new AppError(`${label} is invalid`, 400);
  return String(value);
}

function requireSchool(schoolId) {
  if (!mongoose.isValidObjectId(schoolId)) throw new AppError('Invalid school context', 400);
  return String(schoolId);
}

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function parseDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${label} must be a valid date`, 400);
  return date;
}

function fullName(student) {
  return [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
}

async function assertYear(schoolId, id, label) {
  const year = await studentRepository.findYearById(schoolId, requireId(id, label));
  if (!year) throw new AppError(`${label}: academic year not found`, 404);
  return year;
}
async function assertClass(schoolId, id, label) {
  const cls = await studentRepository.findClassById(schoolId, requireId(id, label));
  if (!cls) throw new AppError(`${label}: class not found`, 404);
  return cls;
}
async function assertSection(schoolId, id, label) {
  const section = await studentRepository.findSectionById(schoolId, requireId(id, label));
  if (!section) throw new AppError(`${label}: section not found`, 404);
  return section;
}

async function pendingFees(schoolId, studentId) {
  const invoices = await FeeInvoice.find({
    schoolId: oid(schoolId),
    studentId,
    status: { $in: UNPAID_STATUSES },
    balanceAmount: { $gt: 0 },
  }).select('invoiceNumber balanceAmount status');
  const total = invoices.reduce((sum, inv) => sum + (Number(inv.balanceAmount) || 0), 0);
  return { total, count: invoices.length };
}

function conflict(message, code, details) {
  const err = new AppError(message, 409, code);
  err.details = details;
  return err;
}

export class StudentLifecycleService {
  // ---------------------------------------------------------------- promotion
  async promotionPreview(schoolIdRaw, { fromAcademicYearId, fromClassId, fromSectionId } = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    await assertYear(schoolId, fromAcademicYearId, 'From academic year');
    await assertClass(schoolId, fromClassId, 'From class');
    const query = {
      schoolId: oid(schoolId),
      academicYearId: fromAcademicYearId,
      classId: fromClassId,
      status: 'ACTIVE',
    };
    if (fromSectionId) query.sectionId = requireId(fromSectionId, 'From section');
    const enrollments = await StudentEnrollment.find(query).sort({ rollNumber: 1 });
    if (!enrollments.length) return [];
    const students = await Student.find({
      _id: { $in: enrollments.map((e) => e.studentId) },
      schoolId: oid(schoolId),
      status: 'ACTIVE',
    });
    const byId = new Map(students.map((s) => [s._id.toString(), s]));
    return enrollments
      .map((e) => {
        const s = byId.get(e.studentId.toString());
        if (!s) return null;
        return {
          id: s._id.toString(),
          name: fullName(s),
          admissionNumber: s.admissionNumber,
          rollNumber: e.rollNumber || '',
          sectionId: e.sectionId.toString(),
          enrollmentId: e._id.toString(),
        };
      })
      .filter(Boolean);
  }

  async promote(schoolIdRaw, body = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const { fromAcademicYearId, toAcademicYearId, fromClassId, fromSectionId, toClassId, toSectionId } = body;
    const studentIds = Array.isArray(body.studentIds) ? body.studentIds.map(String) : [];
    const rollNumbers = body.rollNumbers && typeof body.rollNumbers === 'object' ? body.rollNumbers : {};
    if (!studentIds.length) throw new AppError('Select at least one student to promote', 400);
    if (studentIds.some((id) => !mongoose.isValidObjectId(id))) throw new AppError('Student ID is invalid', 400);

    const [fromYear, toYear, fromClass, toClass, toSection] = await Promise.all([
      assertYear(schoolId, fromAcademicYearId, 'From academic year'),
      assertYear(schoolId, toAcademicYearId, 'To academic year'),
      assertClass(schoolId, fromClassId, 'From class'),
      assertClass(schoolId, toClassId, 'To class'),
      assertSection(schoolId, toSectionId, 'To section'),
    ]);
    if (fromYear._id.equals(toYear._id)) throw new AppError('Source and target academic years must differ', 400);
    if (!toSection.classId.equals(toClass._id) || !toSection.academicYearId.equals(toYear._id)) {
      throw new AppError('Target section does not belong to the target class and academic year', 400);
    }
    if (fromSectionId) await assertSection(schoolId, fromSectionId, 'From section');

    // Candidates = ACTIVE enrollments in the source year/class(/section).
    const sourceQuery = {
      schoolId: oid(schoolId),
      studentId: { $in: studentIds },
      academicYearId: fromYear._id,
      classId: fromClass._id,
      status: 'ACTIVE',
    };
    if (fromSectionId) sourceQuery.sectionId = fromSectionId;
    const sourceEnrollments = await StudentEnrollment.find(sourceQuery);
    const sourceByStudent = new Map(sourceEnrollments.map((e) => [e.studentId.toString(), e]));

    // 409 when any selected student already has an ACTIVE enrollment in the target year.
    const existing = await StudentEnrollment.find({
      schoolId: oid(schoolId),
      studentId: { $in: studentIds },
      academicYearId: toYear._id,
      status: 'ACTIVE',
    }).select('studentId');
    if (existing.length) {
      const ids = existing.map((e) => e.studentId.toString());
      const names = await Student.find({ _id: { $in: ids } }).select('firstName lastName admissionNumber');
      throw conflict(
        `${ids.length} student(s) already have an active enrollment in ${toYear.name}: ${names
          .map((s) => `${fullName(s)} (${s.admissionNumber})`)
          .join(', ')}`,
        'ALREADY_ENROLLED',
        { studentIds: ids }
      );
    }

    // Capacity of the target section.
    const occupied = await StudentEnrollment.countDocuments({
      schoolId: oid(schoolId),
      sectionId: toSection._id,
      academicYearId: toYear._id,
      status: 'ACTIVE',
    });
    const eligible = studentIds.filter((id) => sourceByStudent.has(id));
    if (toSection.capacity && occupied + eligible.length > toSection.capacity) {
      throw conflict(
        `Section ${toSection.name} capacity (${toSection.capacity}) would be exceeded: ${occupied} enrolled + ${eligible.length} to promote`,
        'SECTION_FULL',
        { capacity: toSection.capacity, occupied, requested: eligible.length }
      );
    }

    const skipped = [];
    let promoted = 0;
    const now = new Date();
    for (const studentId of studentIds) {
      const current = sourceByStudent.get(studentId);
      if (!current) {
        skipped.push({ studentId, reason: 'No active enrollment in the source class/year' });
        continue;
      }
      try {
        const roll = rollNumbers[studentId] !== undefined ? text(rollNumbers[studentId]) : '';
        const next = await studentRepository.createEnrollment({
          schoolId,
          studentId,
          academicYearId: toYear._id,
          classId: toClass._id,
          sectionId: toSection._id,
          admissionNumber: current.admissionNumber,
          rollNumber: roll,
          enrollmentDate: toYear.startDate || now,
          status: 'ACTIVE',
        });
        await studentRepository.updateEnrollment(schoolId, current._id, { status: 'PROMOTED', leavingDate: now });
        promoted += 1;
        try {
          await feeService.autoAssignStudentFees(schoolId, studentId, {
            enrollmentId: next._id,
            classId: toClass._id,
            academicYearId: toYear._id,
          });
        } catch (feeError) {
          // A missing fee structure for the new class is not a promotion failure.
          console.warn('[promote] fee auto-assign failed', studentId, feeError?.message);
        }
      } catch (error) {
        skipped.push({
          studentId,
          reason: error?.code === 11000 ? 'Already enrolled in the target year' : error?.message || 'Failed',
        });
      }
    }
    return { promoted, skipped };
  }

  // ----------------------------------------------------------- transfer / TC
  async transfer(schoolIdRaw, studentIdRaw, body = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(studentIdRaw, 'Student ID');
    const type = text(body.type).toUpperCase();
    if (!LEAVING_TYPES.includes(type)) throw new AppError('Type must be TRANSFERRED or WITHDRAWN', 400);
    const reason = text(body.reason);
    if (!reason) throw new AppError('Reason is required', 400);
    const leavingDate = parseDate(body.leavingDate, 'Leaving date') || new Date();
    const tcNumber = text(body.tcNumber);

    const student = await studentRepository.findStudentById(schoolId, studentId);
    if (!student) throw new AppError('Student not found', 404);
    if (student.leaving) throw new AppError('Student has already left; reactivate first to change', 409);

    const force = body.force === true || body.force === 'true';
    if (!force) {
      const fees = await pendingFees(schoolId, student._id);
      if (fees.count > 0) {
        throw conflict(
          `Clear pending fees (₹${fees.total.toLocaleString('en-IN')}) before transfer`,
          'FEES_PENDING',
          { pendingAmount: fees.total, invoiceCount: fees.count }
        );
      }
    }

    const current = await studentRepository.findCurrentEnrollmentByStudent(schoolId, student._id);
    if (current && current.status === 'ACTIVE') {
      await studentRepository.updateEnrollment(schoolId, current._id, { status: type, leavingDate });
    }
    student.status = 'INACTIVE';
    student.leaving = { type, reason, date: leavingDate, tcNumber };
    await student.save();
    return studentService.getStudent(schoolId, student._id);
  }

  async reactivate(schoolIdRaw, studentIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(studentIdRaw, 'Student ID');
    const student = await studentRepository.findStudentById(schoolId, studentId);
    if (!student) throw new AppError('Student not found', 404);
    const current = await studentRepository.findCurrentEnrollmentByStudent(schoolId, student._id);
    if (current && ['TRANSFERRED', 'WITHDRAWN'].includes(current.status)) {
      await studentRepository.updateEnrollment(schoolId, current._id, { status: 'ACTIVE', leavingDate: null });
    }
    student.status = 'ACTIVE';
    student.leaving = null;
    await student.save();
    return studentService.getStudent(schoolId, student._id);
  }

  async transferCertificate(schoolIdRaw, studentIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(studentIdRaw, 'Student ID');
    const student = await studentRepository.findStudentById(schoolId, studentId);
    if (!student) throw new AppError('Student not found', 404);
    const [school, enrollment] = await Promise.all([
      School.findById(schoolId),
      studentRepository.findCurrentEnrollmentByStudent(schoolId, student._id),
    ]);
    const [year, cls, section] = enrollment
      ? await Promise.all([
          studentRepository.findYearById(schoolId, enrollment.academicYearId),
          studentRepository.findClassById(schoolId, enrollment.classId),
          studentRepository.findSectionById(schoolId, enrollment.sectionId),
        ])
      : [null, null, null];
    // Earliest enrollment = date of admission.
    const first = await StudentEnrollment.findOne({ schoolId: oid(schoolId), studentId: student._id }).sort({
      enrollmentDate: 1,
      createdAt: 1,
    });
    const addr = school?.address || {};
    return {
      school: {
        name: school?.name || '',
        code: school?.code || '',
        address: [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', '),
        phone: school?.contact?.phone || '',
        email: school?.contact?.email || '',
      },
      student: {
        id: student._id.toString(),
        name: fullName(student),
        admissionNumber: student.admissionNumber,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        parentName: student.parentName,
        address: student.address,
      },
      academicYear: year ? year.name : '',
      className: cls ? cls.name : '',
      sectionName: section ? section.name : '',
      rollNumber: enrollment?.rollNumber || '',
      admissionDate: first?.enrollmentDate || student.createdAt,
      leavingDate: student.leaving?.date || enrollment?.leavingDate || null,
      enrollmentStatus: enrollment?.status || '',
      leaving: student.leaving
        ? {
            type: student.leaving.type,
            reason: student.leaving.reason,
            tcNumber: student.leaving.tcNumber,
            date: student.leaving.date,
          }
        : null,
      issuedAt: new Date(),
    };
  }

  // -------------------------------------------------------------- CSV import
  importTemplate() {
    return toCsv([
      IMPORT_HEADERS,
      ['ADM-2026-001', 'Aarav', 'Mehta', 'MALE', '2014-06-15', 'Class 5', 'A', '1', 'Rohan Mehta', '9876543210', 'aarav@example.com', '', '12 MG Road, Pune'],
    ]);
  }

  async importCsv(schoolIdRaw, { academicYearId, buffer, dryRun = false } = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const year = await assertYear(schoolId, academicYearId, 'Academic year');
    if (!buffer || !buffer.length) throw new AppError('CSV file is required', 400);
    const { headers, records } = parseCsvObjects(buffer.toString('utf8'));
    if (!headers.length) throw new AppError('CSV file is empty', 400);
    const missing = ['admissionNumber', 'firstName', 'className', 'sectionName', 'parentName', 'parentPhone'].filter(
      (h) => !headers.includes(h)
    );
    if (missing.length) throw new AppError(`CSV is missing required column(s): ${missing.join(', ')}`, 400);
    if (!records.length) throw new AppError('CSV has no data rows', 400);
    if (records.length > 2000) throw new AppError('CSV import is limited to 2000 rows at a time', 400);

    const [classes, sections] = await Promise.all([
      SchoolClass.find({ schoolId: oid(schoolId), academicYearId: year._id }),
      Section.find({ schoolId: oid(schoolId), academicYearId: year._id }),
    ]);
    const classByName = new Map();
    classes.forEach((c) => {
      classByName.set(c.name.trim().toLowerCase(), c);
      if (c.code) classByName.set(c.code.trim().toLowerCase(), c);
    });
    const sectionKey = (classId, name) => `${classId}::${text(name).toLowerCase()}`;
    const sectionByKey = new Map(sections.map((s) => [sectionKey(s.classId.toString(), s.name), s]));

    const existingAdm = new Set(
      (await Student.find({ schoolId: oid(schoolId) }).select('admissionNumber')).map((s) =>
        s.admissionNumber.trim().toLowerCase()
      )
    );
    const seenInFile = new Set();

    const failed = [];
    const rows = [];
    let imported = 0;
    let valid = 0;
    for (let i = 0; i < records.length; i += 1) {
      const rec = records[i];
      const rowNo = i + 2; // 1-based, after the header
      const admissionNumber = text(rec.admissionNumber);
      const name = [text(rec.firstName), text(rec.lastName)].filter(Boolean).join(' ');
      const errors = [];
      if (!admissionNumber) errors.push('admissionNumber is required');
      if (!text(rec.firstName)) errors.push('firstName is required');
      if (!text(rec.parentName)) errors.push('parentName is required');
      if (!text(rec.parentPhone)) errors.push('parentPhone is required');
      const gender = text(rec.gender).toUpperCase();
      if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(gender)) errors.push('gender must be MALE/FEMALE/OTHER');
      if (text(rec.dateOfBirth) && Number.isNaN(new Date(rec.dateOfBirth).getTime())) errors.push('dateOfBirth must be YYYY-MM-DD');
      const cls = classByName.get(text(rec.className).toLowerCase());
      if (!cls) errors.push(`class "${text(rec.className)}" not found in ${year.name}`);
      const section = cls ? sectionByKey.get(sectionKey(cls._id.toString(), rec.sectionName)) : null;
      if (cls && !section) errors.push(`section "${text(rec.sectionName)}" not found in ${cls.name}`);
      const admKey = admissionNumber.toLowerCase();
      if (admKey && existingAdm.has(admKey)) errors.push('admissionNumber already exists');
      else if (admKey && seenInFile.has(admKey)) errors.push('duplicate admissionNumber in file');
      if (admKey) seenInFile.add(admKey);

      if (errors.length) {
        const error = errors.join('; ');
        failed.push({ row: rowNo, admissionNumber, error });
        rows.push({ row: rowNo, admissionNumber, name, status: 'INVALID', error });
        continue;
      }
      const payload = {
        admissionNumber,
        firstName: text(rec.firstName),
        lastName: text(rec.lastName),
        gender: gender || 'OTHER',
        dateOfBirth: text(rec.dateOfBirth) || '',
        email: text(rec.email),
        phone: text(rec.phone),
        parentName: text(rec.parentName),
        parentPhone: text(rec.parentPhone),
        address: text(rec.address),
        academicYearId: year._id.toString(),
        classId: cls._id.toString(),
        sectionId: section._id.toString(),
        rollNumber: text(rec.rollNumber),
        status: 'ACTIVE',
      };
      const base = { row: rowNo, admissionNumber, name, className: cls.name, sectionName: section.name };
      if (dryRun) {
        valid += 1;
        rows.push({ ...base, status: 'VALID' });
        continue;
      }
      try {
        await studentService.createStudent(schoolId, payload);
        imported += 1;
        existingAdm.add(admKey);
        rows.push({ ...base, status: 'IMPORTED' });
      } catch (error) {
        const message = error?.message || 'Failed to create student';
        failed.push({ row: rowNo, admissionNumber, error: message });
        rows.push({ ...base, status: 'FAILED', error: message });
      }
    }
    return { dryRun: Boolean(dryRun), total: records.length, imported, valid, failed, rows };
  }
}

export const studentLifecycleService = new StudentLifecycleService();
