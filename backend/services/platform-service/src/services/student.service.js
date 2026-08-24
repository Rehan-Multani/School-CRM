import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { studentRepository } from '../repositories/student.repository.js';
import {
  deleteUploadedFile,
  toStudentPhotoPublicPath,
  toStudentDocumentPublicPath,
} from '../utils/upload.utils.js';

const STUDENT_STATUSES = ['ACTIVE', 'INACTIVE'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  return text;
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureOption(value, options, label) {
  const text = requireText(value, label);
  if (!options.includes(text)) throw new AppError(`${label} is invalid`, 400);
  return text;
}

function parseDate(value, label) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${label} must be a valid date`, 400);
  return date;
}

function mapMongoError(error) {
  if (error?.code !== 11000) throw error;
  throw new AppError('A student with these details already exists', 409);
}

async function assertYear(schoolId, academicYearId) {
  const year = await studentRepository.findYearById(schoolId, academicYearId);
  if (!year) throw new AppError('Academic year not found', 404);
  return year;
}

async function assertClass(schoolId, classId) {
  const cls = await studentRepository.findClassById(schoolId, classId);
  if (!cls) throw new AppError('Class not found', 404);
  return cls;
}

async function assertSection(schoolId, sectionId) {
  const section = await studentRepository.findSectionById(schoolId, sectionId);
  if (!section) throw new AppError('Section not found', 404);
  return section;
}

function buildStudentPayload(payload) {
  return {
    admissionNumber: requireText(payload.admissionNumber, 'Admission number'),
    firstName: requireText(payload.firstName, 'First name'),
    lastName: optionalText(payload.lastName),
    gender: payload.gender ? ensureOption(payload.gender, GENDERS, 'Gender') : 'OTHER',
    dateOfBirth: parseDate(payload.dateOfBirth, 'Date of birth'),
    email: optionalText(payload.email).toLowerCase(),
    phone: optionalText(payload.phone),
    parentName: requireText(payload.parentName, 'Parent name'),
    parentPhone: requireText(payload.parentPhone, 'Parent phone'),
    address: optionalText(payload.address),
    status: payload.status ? ensureOption(payload.status, STUDENT_STATUSES, 'Status') : 'ACTIVE',
  };
}

function fullStudent(student) {
  return [student.firstName, student.lastName].filter(Boolean).join(' ').trim();
}

function isTruthyFlag(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

export class StudentService {
  async listStudents(schoolId, filters) {
    const students = await studentRepository.listStudents(schoolId, filters);
    const ids = students.map((student) => student._id);
    const enrollments = await studentRepository.listEnrollmentsForStudents(schoolId, ids, filters);

    const latestEnrollmentByStudent = new Map();
    for (const enrollment of enrollments) {
      const key = enrollment.studentId.toString();
      if (!latestEnrollmentByStudent.has(key)) {
        latestEnrollmentByStudent.set(key, enrollment);
      }
    }

    const yearIds = [...new Set(enrollments.map((item) => item.academicYearId?.toString()).filter(Boolean))];
    const classIds = [...new Set(enrollments.map((item) => item.classId?.toString()).filter(Boolean))];
    const sectionIds = [...new Set(enrollments.map((item) => item.sectionId?.toString()).filter(Boolean))];

    const [years, classes, sections] = await Promise.all([
      studentRepository.findYearsByIds(schoolId, yearIds),
      studentRepository.findClassesByIds(schoolId, classIds),
      studentRepository.findSectionsByIds(schoolId, sectionIds),
    ]);

    const yearMap = new Map(years.filter(Boolean).map((item) => [item._id.toString(), item.toPublicJSON()]));
    const classMap = new Map(classes.filter(Boolean).map((item) => [item._id.toString(), item.toPublicJSON()]));
    const sectionMap = new Map(sections.filter(Boolean).map((item) => [item._id.toString(), item.toPublicJSON()]));

    return students
      .map((student) => {
        const enrollment = latestEnrollmentByStudent.get(student._id.toString());
        if ((filters?.academicYearId || filters?.classId || filters?.sectionId) && !enrollment) {
          return null;
        }

        const base = student.toPublicJSON();
        return {
          ...base,
          name: fullStudent(base),
          enrollment: enrollment
            ? {
                ...enrollment.toPublicJSON(),
                academicYear: yearMap.get(enrollment.academicYearId.toString()) || null,
                class: classMap.get(enrollment.classId.toString()) || null,
                section: sectionMap.get(enrollment.sectionId.toString()) || null,
              }
            : null,
        };
      })
      .filter(Boolean);
  }

  async getStudent(schoolId, studentId) {
    const student = await studentRepository.findStudentById(schoolId, studentId);
    if (!student) throw new AppError('Student not found', 404);

    const enrollment = await studentRepository.findCurrentEnrollmentByStudent(schoolId, student._id);
    const [year, cls, section] = enrollment
      ? await Promise.all([
          studentRepository.findYearById(schoolId, enrollment.academicYearId),
          studentRepository.findClassById(schoolId, enrollment.classId),
          studentRepository.findSectionById(schoolId, enrollment.sectionId),
        ])
      : [null, null, null];

    const base = student.toPublicJSON();
    return {
      ...base,
      name: fullStudent(base),
      enrollment: enrollment
        ? {
            ...enrollment.toPublicJSON(),
            academicYear: year ? year.toPublicJSON() : null,
            class: cls ? cls.toPublicJSON() : null,
            section: section ? section.toPublicJSON() : null,
          }
        : null,
    };
  }

  async createStudent(schoolId, payload, files = {}) {
    if (!mongoose.isValidObjectId(schoolId)) throw new AppError('Invalid school context', 400);
    const [year, cls, section] = await Promise.all([
      assertYear(schoolId, payload.academicYearId),
      assertClass(schoolId, payload.classId),
      assertSection(schoolId, payload.sectionId),
    ]);

    if (section.academicYearId.toString() !== year._id.toString()) {
      throw new AppError('Selected section does not belong to the chosen academic year', 400);
    }
    if (section.classId.toString() !== cls._id.toString()) {
      throw new AppError('Selected section does not belong to the chosen class', 400);
    }

    const studentPayload = buildStudentPayload(payload);
    let student = null;
    try {
      const docPaths = {
        aadhaar: (files.aadhaar || []).map((f) => toStudentDocumentPublicPath(f.filename)),
        marksheet: (files.marksheet || []).map((f) => toStudentDocumentPublicPath(f.filename)),
      };

      student = await studentRepository.createStudent({
        schoolId,
        ...studentPayload,
        photo: files.photo ? toStudentPhotoPublicPath(files.photo.filename) : '',
        documents: docPaths,
      });

      await studentRepository.createEnrollment({
        schoolId,
        studentId: student._id,
        academicYearId: payload.academicYearId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        rollNumber: optionalText(payload.rollNumber),
        admissionNumber: studentPayload.admissionNumber,
        status: studentPayload.status === 'INACTIVE' ? 'WITHDRAWN' : 'ACTIVE',
        leavingDate: studentPayload.status === 'INACTIVE' ? new Date() : null,
        enrollmentDate: parseDate(payload.enrollmentDate, 'Enrollment date') || new Date(),
      });
    } catch (error) {
      if (files.photo) {
        deleteUploadedFile(toStudentPhotoPublicPath(files.photo.filename));
      }
      if (files.aadhaar) {
        files.aadhaar.forEach((f) => deleteUploadedFile(toStudentDocumentPublicPath(f.filename)));
      }
      if (files.marksheet) {
        files.marksheet.forEach((f) => deleteUploadedFile(toStudentDocumentPublicPath(f.filename)));
      }
      if (student?._id) {
        await studentRepository.deleteStudent(schoolId, student._id);
      }
      mapMongoError(error);
    }

    return this.getStudent(schoolId, student._id);
  }

  async updateStudent(schoolId, studentId, payload, files = {}) {
    const existing = await studentRepository.findStudentById(schoolId, studentId);
    if (!existing) throw new AppError('Student not found', 404);
    const shouldRemovePhoto = isTruthyFlag(payload.removePhoto);

    const update = {};
    if (payload.admissionNumber !== undefined) update.admissionNumber = requireText(payload.admissionNumber, 'Admission number');
    if (payload.firstName !== undefined) update.firstName = requireText(payload.firstName, 'First name');
    if (payload.lastName !== undefined) update.lastName = optionalText(payload.lastName);
    if (payload.gender !== undefined) update.gender = ensureOption(payload.gender, GENDERS, 'Gender');
    if (payload.dateOfBirth !== undefined) update.dateOfBirth = parseDate(payload.dateOfBirth, 'Date of birth');
    if (payload.email !== undefined) update.email = optionalText(payload.email).toLowerCase();
    if (payload.phone !== undefined) update.phone = optionalText(payload.phone);
    if (payload.parentName !== undefined) update.parentName = requireText(payload.parentName, 'Parent name');
    if (payload.parentPhone !== undefined) update.parentPhone = requireText(payload.parentPhone, 'Parent phone');
    if (payload.address !== undefined) update.address = optionalText(payload.address);
    if (payload.status !== undefined) update.status = ensureOption(payload.status, STUDENT_STATUSES, 'Status');
    if (files.photo) update.photo = toStudentPhotoPublicPath(files.photo.filename);
    if (!files.photo && shouldRemovePhoto) update.photo = '';

    // Handle documents update
    const currentDocs = existing.documents || { aadhaar: [], marksheet: [] };
    const aadhaarPaths = [...(currentDocs.aadhaar || [])];
    const marksheetPaths = [...(currentDocs.marksheet || [])];

    if (files.aadhaar && files.aadhaar.length) {
      files.aadhaar.forEach((f) => aadhaarPaths.push(toStudentDocumentPublicPath(f.filename)));
    }
    if (files.marksheet && files.marksheet.length) {
      files.marksheet.forEach((f) => marksheetPaths.push(toStudentDocumentPublicPath(f.filename)));
    }

    if (payload.removeDocuments) {
      let toRemove = [];
      try {
        toRemove = typeof payload.removeDocuments === 'string'
          ? JSON.parse(payload.removeDocuments)
          : payload.removeDocuments;
      } catch {
        toRemove = [payload.removeDocuments];
      }
      if (Array.isArray(toRemove)) {
        toRemove.forEach((pathToRemove) => {
          deleteUploadedFile(pathToRemove);
          const indexAadhaar = aadhaarPaths.indexOf(pathToRemove);
          if (indexAadhaar > -1) aadhaarPaths.splice(indexAadhaar, 1);
          const indexMarksheet = marksheetPaths.indexOf(pathToRemove);
          if (indexMarksheet > -1) marksheetPaths.splice(indexMarksheet, 1);
        });
      }
    }

    update.documents = {
      aadhaar: aadhaarPaths,
      marksheet: marksheetPaths,
    };

    try {
      await studentRepository.updateStudent(schoolId, studentId, update);
    } catch (error) {
      if (files.photo) {
        deleteUploadedFile(toStudentPhotoPublicPath(files.photo.filename));
      }
      if (files.aadhaar) {
        files.aadhaar.forEach((f) => deleteUploadedFile(toStudentDocumentPublicPath(f.filename)));
      }
      if (files.marksheet) {
        files.marksheet.forEach((f) => deleteUploadedFile(toStudentDocumentPublicPath(f.filename)));
      }
      mapMongoError(error);
    }

    if ((files.photo || shouldRemovePhoto) && existing.photo && existing.photo !== update.photo) {
      deleteUploadedFile(existing.photo);
    }

    const enrollment = await studentRepository.findCurrentEnrollmentByStudent(schoolId, studentId);
    if (enrollment) {
      const enrollmentUpdate = {};

      if (payload.academicYearId || payload.classId || payload.sectionId) {
        const nextAcademicYearId = payload.academicYearId || enrollment.academicYearId.toString();
        const nextClassId = payload.classId || enrollment.classId.toString();
        const nextSectionId = payload.sectionId || enrollment.sectionId.toString();

        const [year, cls, section] = await Promise.all([
          assertYear(schoolId, nextAcademicYearId),
          assertClass(schoolId, nextClassId),
          assertSection(schoolId, nextSectionId),
        ]);

        if (section.academicYearId.toString() !== year._id.toString()) {
          throw new AppError('Selected section does not belong to the chosen academic year', 400);
        }
        if (section.classId.toString() !== cls._id.toString()) {
          throw new AppError('Selected section does not belong to the chosen class', 400);
        }

        enrollmentUpdate.academicYearId = nextAcademicYearId;
        enrollmentUpdate.classId = nextClassId;
        enrollmentUpdate.sectionId = nextSectionId;
      }

      if (payload.rollNumber !== undefined) enrollmentUpdate.rollNumber = optionalText(payload.rollNumber);
      if (payload.admissionNumber !== undefined) enrollmentUpdate.admissionNumber = requireText(payload.admissionNumber, 'Admission number');
      if (payload.enrollmentDate !== undefined) {
        enrollmentUpdate.enrollmentDate = parseDate(payload.enrollmentDate, 'Enrollment date') || new Date();
      }
      if (payload.status !== undefined) {
        const isInactive = payload.status === 'INACTIVE';
        enrollmentUpdate.status = isInactive ? 'WITHDRAWN' : 'ACTIVE';
        enrollmentUpdate.leavingDate = isInactive ? new Date() : null;
      }

      if (Object.keys(enrollmentUpdate).length > 0) {
        await studentRepository.updateEnrollment(schoolId, enrollment._id, enrollmentUpdate);
      }
    }

    return this.getStudent(schoolId, studentId);
  }

  async updateStudentStatus(schoolId, studentId, status) {
    const nextStatus = ensureOption(status, STUDENT_STATUSES, 'Status');
    const student = await studentRepository.findStudentById(schoolId, studentId);
    if (!student) throw new AppError('Student not found', 404);

    await studentRepository.updateStudent(schoolId, studentId, { status: nextStatus });
    const enrollment = await studentRepository.findCurrentEnrollmentByStudent(schoolId, student._id);
    if (enrollment) {
      await studentRepository.updateEnrollment(schoolId, enrollment._id, {
        status: nextStatus === 'INACTIVE' ? 'WITHDRAWN' : 'ACTIVE',
        leavingDate: nextStatus === 'INACTIVE' ? new Date() : null,
      });
    }

    return this.getStudent(schoolId, studentId);
  }

  async deleteStudent(schoolId, studentId) {
    const student = await studentRepository.findStudentById(schoolId, studentId);
    if (!student) throw new AppError('Student not found', 404);
    await studentRepository.deleteEnrollmentsByStudent(schoolId, student._id);
    await studentRepository.deleteStudent(schoolId, student._id);
    if (student.photo) {
      deleteUploadedFile(student.photo);
    }
    if (student.documents) {
      if (Array.isArray(student.documents.aadhaar)) {
        student.documents.aadhaar.forEach(deleteUploadedFile);
      }
      if (Array.isArray(student.documents.marksheet)) {
        student.documents.marksheet.forEach(deleteUploadedFile);
      }
    }
    return { message: 'Student deleted successfully' };
  }
}

export const studentService = new StudentService();
