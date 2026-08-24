import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { academicRepository } from '../repositories/academic.repository.js';
import {
  deleteMulterFiles,
  deleteUploadedFile,
  toTeacherDocumentPublicPath,
  toTeacherPhotoPublicPath,
} from '../utils/upload.utils.js';

const YEAR_STATUSES = ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'];
const ENTITY_STATUSES = ['ACTIVE', 'INACTIVE'];
const TEACHER_STATUSES = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED'];
const SUBJECT_TYPES = ['THEORY', 'PRACTICAL', 'BOTH', 'ACTIVITY'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const MARITAL_STATUSES = ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'];
const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'VISITING', 'TEMPORARY'];
const ACCOUNT_STATUSES = ['PENDING', 'ACTIVE', 'INACTIVE'];

const DEFAULT_CLASSES = [
  { name: 'Nursery', code: 'NUR', numericOrder: 1 },
  { name: 'LKG', code: 'LKG', numericOrder: 2 },
  { name: 'UKG', code: 'UKG', numericOrder: 3 },
  { name: 'Class 1', code: 'C1', numericOrder: 4 },
  { name: 'Class 2', code: 'C2', numericOrder: 5 },
  { name: 'Class 3', code: 'C3', numericOrder: 6 },
  { name: 'Class 4', code: 'C4', numericOrder: 7 },
  { name: 'Class 5', code: 'C5', numericOrder: 8 },
  { name: 'Class 6', code: 'C6', numericOrder: 9 },
  { name: 'Class 7', code: 'C7', numericOrder: 10 },
  { name: 'Class 8', code: 'C8', numericOrder: 11 },
  { name: 'Class 9', code: 'C9', numericOrder: 12 },
  { name: 'Class 10', code: 'C10', numericOrder: 13 },
  { name: 'Class 11', code: 'C11', numericOrder: 14 },
  { name: 'Class 12', code: 'C12', numericOrder: 15 },
];

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${label} must be a valid date`, 400);
  return date;
}

function parseOptionalDate(value, label) {
  if (value === undefined || value === null || value === '') return null;
  return parseDate(value, label);
}

function optionalEnum(value, options, label) {
  if (value === undefined || value === null || value === '') return '';
  return ensureOption(value, options, label);
}

function isTruthyFlag(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function normalizeTeacherName(payload = {}, existingName = '') {
  const firstName = optionalText(payload.firstName);
  const middleName = optionalText(payload.middleName);
  const lastName = optionalText(payload.lastName);
  const legacyName = optionalText(payload.name);
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
  return fullName || legacyName || existingName;
}

function sanitizeQualifications(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      degree: optionalText(item?.degree),
      specialization: optionalText(item?.specialization),
      institution: optionalText(item?.institution),
      passingYear: item?.passingYear ? Number(item.passingYear) : null,
      score: optionalText(item?.score),
      certificateFile: optionalText(item?.certificateFile),
    }))
    .filter((item) => item.degree || item.institution || item.passingYear || item.score);
}

function sanitizeExperiences(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      organization: optionalText(item?.organization),
      designation: optionalText(item?.designation),
      startDate: parseOptionalDate(item?.startDate, 'Experience start date'),
      endDate: parseOptionalDate(item?.endDate, 'Experience end date'),
      description: optionalText(item?.description),
      certificateFile: optionalText(item?.certificateFile),
    }))
    .filter((item) => item.organization || item.designation || item.startDate || item.endDate || item.description);
}

function emptyDocuments() {
  return { pan: [], aadhaar: [], others: [] };
}

function asDocumentMap(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return emptyDocuments();
  return {
    pan: Array.isArray(value.pan) ? value.pan.filter(Boolean).slice(0, 2) : [],
    aadhaar: Array.isArray(value.aadhaar) ? value.aadhaar.filter(Boolean).slice(0, 2) : [],
    others: Array.isArray(value.others) ? value.others.filter(Boolean).slice(0, 2) : [],
  };
}

function collectDocumentPaths(docs) {
  const map = asDocumentMap(docs);
  return [...map.pan, ...map.aadhaar, ...map.others];
}

function documentPublicPath(file) {
  return toTeacherDocumentPublicPath(file.filename);
}

function mergeDocumentUploads(keepInput, existingDocs, files = {}) {
  const existing = asDocumentMap(existingDocs);
  const hasUploads = ['pan', 'aadhaar', 'others'].some((key) => (files[key] || []).length);
  if (keepInput === undefined && !hasUploads) return existing;

  const keep = asDocumentMap(keepInput);
  const next = emptyDocuments();
  const unusedUploads = [];
  for (const key of ['pan', 'aadhaar', 'others']) {
    const uploadedFiles = files[key] || [];
    // A category missing from documentsKeep is not managed by the caller, so leave it untouched.
    if (keepInput?.[key] === undefined && !uploadedFiles.length) {
      next[key] = existing[key];
      continue;
    }
    const kept = keep[key].filter((item) => existing[key].includes(item));
    const slots = Math.max(0, 2 - kept.length);
    const used = uploadedFiles.slice(0, slots);
    unusedUploads.push(...uploadedFiles.slice(slots));
    next[key] = [...kept, ...used.map(documentPublicPath)];
  }
  cleanupTeacherUploadFiles(unusedUploads);
  return next;
}

function deleteRemovedDocuments(previous, next) {
  const nextPaths = new Set(collectDocumentPaths(next));
  for (const publicPath of collectDocumentPaths(previous)) {
    if (!nextPaths.has(publicPath)) deleteUploadedFile(publicPath);
  }
}

function cleanupTeacherUploadFiles(files = {}) {
  deleteMulterFiles(files);
}

function sanitizeTeacherPayload(payload = {}, existing = null) {
  const name = normalizeTeacherName(payload, existing?.name || '');
  if (!name) throw new AppError('Teacher name is required', 400);

  return {
    employeeId: payload.employeeId !== undefined ? optionalText(payload.employeeId) : existing?.employeeId,
    name,
    firstName: payload.firstName !== undefined ? optionalText(payload.firstName) : existing?.firstName || '',
    middleName: payload.middleName !== undefined ? optionalText(payload.middleName) : existing?.middleName || '',
    lastName: payload.lastName !== undefined ? optionalText(payload.lastName) : existing?.lastName || '',
    profilePhoto: payload.profilePhoto !== undefined ? optionalText(payload.profilePhoto) : existing?.profilePhoto || '',
    gender: payload.gender !== undefined ? optionalEnum(payload.gender, GENDERS, 'Gender') : existing?.gender || '',
    dateOfBirth:
      payload.dateOfBirth !== undefined
        ? parseOptionalDate(payload.dateOfBirth, 'Date of birth')
        : existing?.dateOfBirth || null,
    bloodGroup: payload.bloodGroup !== undefined ? optionalText(payload.bloodGroup) : existing?.bloodGroup || '',
    maritalStatus:
      payload.maritalStatus !== undefined
        ? optionalEnum(payload.maritalStatus, MARITAL_STATUSES, 'Marital status')
        : existing?.maritalStatus || '',
    nationality: payload.nationality !== undefined ? optionalText(payload.nationality) : existing?.nationality || '',
    email: payload.email !== undefined ? optionalText(payload.email).toLowerCase() : existing?.email || '',
    phone:
      payload.mobileNumber !== undefined
        ? optionalText(payload.mobileNumber)
        : payload.phone !== undefined
          ? optionalText(payload.phone)
          : existing?.phone || '',
    mobileNumber:
      payload.mobileNumber !== undefined
        ? optionalText(payload.mobileNumber)
        : payload.phone !== undefined
          ? optionalText(payload.phone)
          : existing?.mobileNumber || existing?.phone || '',
    alternateMobile:
      payload.alternateMobile !== undefined ? optionalText(payload.alternateMobile) : existing?.alternateMobile || '',
    emergencyContactName:
      payload.emergencyContactName !== undefined
        ? optionalText(payload.emergencyContactName)
        : existing?.emergencyContactName || '',
    emergencyContactNumber:
      payload.emergencyContactNumber !== undefined
        ? optionalText(payload.emergencyContactNumber)
        : existing?.emergencyContactNumber || '',
    emergencyContactRelationship:
      payload.emergencyContactRelationship !== undefined
        ? optionalText(payload.emergencyContactRelationship)
        : existing?.emergencyContactRelationship || '',
    address: {
      addressLine:
        payload.address?.addressLine !== undefined
          ? optionalText(payload.address.addressLine)
          : existing?.address?.addressLine || '',
      city: payload.address?.city !== undefined ? optionalText(payload.address.city) : existing?.address?.city || '',
      state: payload.address?.state !== undefined ? optionalText(payload.address.state) : existing?.address?.state || '',
      country:
        payload.address?.country !== undefined ? optionalText(payload.address.country) : existing?.address?.country || '',
      pincode:
        payload.address?.pincode !== undefined ? optionalText(payload.address.pincode) : existing?.address?.pincode || '',
    },
    designation: payload.designation !== undefined ? optionalText(payload.designation) : existing?.designation || '',
    department: payload.department !== undefined ? optionalText(payload.department) : existing?.department || '',
    joiningDate:
      payload.joiningDate !== undefined
        ? parseOptionalDate(payload.joiningDate, 'Joining date')
        : existing?.joiningDate || null,
    employmentType:
      payload.employmentType !== undefined
        ? optionalEnum(payload.employmentType, EMPLOYMENT_TYPES, 'Employment type')
        : existing?.employmentType || '',
    experienceSummary:
      payload.experienceSummary !== undefined
        ? optionalText(payload.experienceSummary)
        : existing?.experienceSummary || '',
    previousExperienceSummary:
      payload.previousExperienceSummary !== undefined
        ? optionalText(payload.previousExperienceSummary)
        : existing?.previousExperienceSummary || '',
    specialization:
      payload.specialization !== undefined ? optionalText(payload.specialization) : existing?.specialization || '',
    qualifications:
      payload.qualifications !== undefined
        ? sanitizeQualifications(payload.qualifications)
        : existing?.qualifications || [],
    experiences:
      payload.experiences !== undefined ? sanitizeExperiences(payload.experiences) : existing?.experiences || [],
    documents: asDocumentMap(existing?.documents),
    payroll: {
      bankName:
        payload.payroll?.bankName !== undefined ? optionalText(payload.payroll.bankName) : existing?.payroll?.bankName || '',
      accountHolderName:
        payload.payroll?.accountHolderName !== undefined
          ? optionalText(payload.payroll.accountHolderName)
          : existing?.payroll?.accountHolderName || '',
      accountNumber:
        payload.payroll?.accountNumber !== undefined
          ? optionalText(payload.payroll.accountNumber)
          : existing?.payroll?.accountNumber || '',
      ifsc: payload.payroll?.ifsc !== undefined ? optionalText(payload.payroll.ifsc) : existing?.payroll?.ifsc || '',
      branch:
        payload.payroll?.branch !== undefined ? optionalText(payload.payroll.branch) : existing?.payroll?.branch || '',
      pan: payload.payroll?.pan !== undefined ? optionalText(payload.payroll.pan) : existing?.payroll?.pan || '',
      uan: payload.payroll?.uan !== undefined ? optionalText(payload.payroll.uan) : existing?.payroll?.uan || '',
      pfNumber:
        payload.payroll?.pfNumber !== undefined
          ? optionalText(payload.payroll.pfNumber)
          : existing?.payroll?.pfNumber || '',
      salaryType: 'MONTHLY',
      basicSalary:
        payload.payroll?.basicSalary !== undefined && payload.payroll?.basicSalary !== ''
          ? Number(payload.payroll.basicSalary)
          : existing?.payroll?.basicSalary ?? null,
    },
    account: {
      createLoginAccount:
        payload.account?.createLoginAccount !== undefined
          ? Boolean(payload.account.createLoginAccount)
          : existing?.account?.createLoginAccount || false,
      loginEmail:
        payload.account?.loginEmail !== undefined
          ? optionalText(payload.account.loginEmail).toLowerCase()
          : existing?.account?.loginEmail || '',
      username:
        payload.account?.username !== undefined ? optionalText(payload.account.username) : existing?.account?.username || '',
      accountStatus:
        payload.account?.accountStatus !== undefined
          ? optionalEnum(payload.account.accountStatus, ACCOUNT_STATUSES, 'Account status')
          : existing?.account?.accountStatus || '',
    },
    attendanceSettings: {
      attendanceId:
        payload.attendanceSettings?.attendanceId !== undefined
          ? optionalText(payload.attendanceSettings.attendanceId)
          : existing?.attendanceSettings?.attendanceId || '',
      weeklyOff:
        payload.attendanceSettings?.weeklyOff !== undefined
          ? optionalText(payload.attendanceSettings.weeklyOff)
          : existing?.attendanceSettings?.weeklyOff || '',
      leavePolicy:
        payload.attendanceSettings?.leavePolicy !== undefined
          ? optionalText(payload.attendanceSettings.leavePolicy)
          : existing?.attendanceSettings?.leavePolicy || '',
    },
    status:
      payload.status !== undefined
        ? ensureOption(payload.status, TEACHER_STATUSES, 'Status')
        : existing?.status || 'ACTIVE',
  };
}

function mapMongoError(error) {
  if (error?.code !== 11000) throw error;
  throw new AppError('A record with these details already exists', 409);
}

async function assertYear(schoolId, academicYearId) {
  const year = await academicRepository.findYearById(schoolId, academicYearId);
  if (!year) throw new AppError('Academic year not found', 404);
  return year;
}

async function assertClass(schoolId, classId) {
  const cls = await academicRepository.findClassById(schoolId, classId);
  if (!cls) throw new AppError('Class not found', 404);
  return cls;
}

async function assertSection(schoolId, sectionId) {
  const section = await academicRepository.findSectionById(schoolId, sectionId);
  if (!section) throw new AppError('Section not found', 404);
  return section;
}

async function assertSubject(schoolId, subjectId) {
  const subject = await academicRepository.findSubjectById(schoolId, subjectId);
  if (!subject) throw new AppError('Subject not found', 404);
  return subject;
}

async function assertTeacher(schoolId, teacherId) {
  if (!teacherId) return null;
  const teacher = await academicRepository.findTeacherById(schoolId, teacherId);
  if (!teacher) throw new AppError('Teacher not found', 404);
  return teacher;
}

function paginationMeta({ total, page, limit }) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export class AcademicService {
  async listYears(schoolId, filters) {
    const { items, total, page, limit } = await academicRepository.listYears(schoolId, filters);
    const data = await Promise.all(
      items.map(async (year) => {
        const json = year.toPublicJSON();
        const [classes, sections, students, subjectAssignments] = await Promise.all([
          academicRepository.countYearClasses(schoolId, year._id),
          academicRepository.countSectionsForYear(schoolId, year._id),
          academicRepository.countEnrollments(schoolId, { academicYearId: year._id }),
          academicRepository.countSectionSubjects(schoolId, { academicYearId: year._id }),
        ]);
        return { ...json, counts: { classes, sections, students, subjectAssignments } };
      })
    );
    return { data, pagination: paginationMeta({ total, page, limit }) };
  }

  async getYear(schoolId, id) {
    const year = await assertYear(schoolId, id);
    const json = year.toPublicJSON();
    const [classes, sections, students, subjectAssignments] = await Promise.all([
      academicRepository.countYearClasses(schoolId, year._id),
      academicRepository.countSectionsForYear(schoolId, year._id),
      academicRepository.countEnrollments(schoolId, { academicYearId: year._id }),
      academicRepository.countSectionSubjects(schoolId, { academicYearId: year._id }),
    ]);
    return { ...json, counts: { classes, sections, students, subjectAssignments } };
  }

  async createYear(schoolId, payload) {
    const name = requireText(payload.name, 'Academic year name');
    const code = requireText(payload.code || name.replace(/\s+/g, '-'), 'Academic year code').toUpperCase();
    const startDate = parseDate(payload.startDate, 'Start date');
    const endDate = parseDate(payload.endDate, 'End date');
    if (startDate >= endDate) throw new AppError('Start date must be before end date', 400);
    const status = payload.status ? ensureOption(payload.status, YEAR_STATUSES, 'Status') : 'DRAFT';

    try {
      const year = await academicRepository.createYear({
        schoolId,
        name,
        code,
        startDate,
        endDate,
        status,
        isCurrent: false,
      });
      return year.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
    }
  }

  async updateYear(schoolId, id, payload) {
    await assertYear(schoolId, id);
    const update = {};
    if (payload.name !== undefined) update.name = requireText(payload.name, 'Academic year name');
    if (payload.code !== undefined) update.code = requireText(payload.code, 'Academic year code').toUpperCase();
    if (payload.startDate !== undefined) update.startDate = parseDate(payload.startDate, 'Start date');
    if (payload.endDate !== undefined) update.endDate = parseDate(payload.endDate, 'End date');
    if (payload.status !== undefined) update.status = ensureOption(payload.status, YEAR_STATUSES, 'Status');
    if (update.startDate && update.endDate && update.startDate >= update.endDate) {
      throw new AppError('Start date must be before end date', 400);
    }

    try {
      const year = await academicRepository.updateYear(schoolId, id, update);
      return year.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
    }
  }

  async activateYear(schoolId, id) {
    const year = await assertYear(schoolId, id);
    if (year.status === 'ARCHIVED') throw new AppError('Archived academic years cannot be activated', 400);
    const updated = await academicRepository.updateYear(schoolId, id, { status: 'ACTIVE' });
    return updated.toPublicJSON();
  }

  async setCurrentYear(schoolId, id) {
    const year = await assertYear(schoolId, id);
    if (year.status === 'ARCHIVED' || year.status === 'DRAFT') {
      throw new AppError('Only active or completed academic years can be set as current', 400);
    }
    await academicRepository.clearCurrentYear(schoolId, id);
    const updated = await academicRepository.updateYear(schoolId, id, { isCurrent: true, status: 'ACTIVE' });
    return updated.toPublicJSON();
  }

  async archiveYear(schoolId, id) {
    await assertYear(schoolId, id);
    const updated = await academicRepository.updateYear(schoolId, id, {
      status: 'ARCHIVED',
      isCurrent: false,
    });
    return updated.toPublicJSON();
  }

  async unarchiveYear(schoolId, id) {
    await assertYear(schoolId, id);
    const updated = await academicRepository.updateYear(schoolId, id, {
      status: 'DRAFT',
    });
    return updated.toPublicJSON();
  }

  async completeYear(schoolId, id) {
    const year = await assertYear(schoolId, id);
    if (year.status !== 'ACTIVE') {
      throw new AppError('Only active academic years can be marked as completed', 400);
    }
    const updated = await academicRepository.updateYear(schoolId, id, {
      status: 'COMPLETED',
      isCurrent: false,
    });
    return updated.toPublicJSON();
  }

  async deleteYear(schoolId, id) {
    const year = await assertYear(schoolId, id);
    const hasDeps = await academicRepository.hasDependentRecords(schoolId, year._id);
    if (hasDeps) {
      throw new AppError('Cannot delete academic year with sections or student records. Archive it instead.', 400);
    }
    await academicRepository.updateYear(schoolId, id, { status: 'ARCHIVED', isCurrent: false });
    return { message: 'Academic year archived successfully' };
  }

  async listClasses(schoolId, filters) {
    const { items, total, page, limit } = await academicRepository.listClasses(schoolId, filters);
    return {
      data: items.map((item) => item.toPublicJSON()),
      pagination: paginationMeta({ total, page, limit }),
    };
  }

  async getClass(schoolId, id) {
    const cls = await assertClass(schoolId, id);
    return cls.toPublicJSON();
  }

  async createClass(schoolId, payload) {
    const name = requireText(payload.name, 'Class name');
    const code = requireText(payload.code || name.replace(/\s+/g, '-'), 'Class code').toUpperCase();
    const numericOrder = Number(payload.numericOrder) || 0;
    const status = payload.status ? ensureOption(payload.status, ENTITY_STATUSES, 'Status') : 'ACTIVE';

    try {
      const cls = await academicRepository.createClass({
        schoolId,
        name,
        code,
        numericOrder,
        description: optionalText(payload.description),
        status,
      });
      return cls.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
    }
  }

  async updateClass(schoolId, id, payload) {
    await assertClass(schoolId, id);
    const update = {};
    if (payload.name !== undefined) update.name = requireText(payload.name, 'Class name');
    if (payload.code !== undefined) update.code = requireText(payload.code, 'Class code').toUpperCase();
    if (payload.numericOrder !== undefined) update.numericOrder = Number(payload.numericOrder);
    if (payload.description !== undefined) update.description = optionalText(payload.description);
    if (payload.status !== undefined) update.status = ensureOption(payload.status, ENTITY_STATUSES, 'Status');

    try {
      const cls = await academicRepository.updateClass(schoolId, id, update);
      return cls.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
    }
  }

  async deleteClass(schoolId, id) {
    await assertClass(schoolId, id);
    const hasDeps = await academicRepository.classHasDependents(schoolId, id);
    if (hasDeps) {
      throw new AppError('Cannot delete class with sections or enrollments. Set status to inactive instead.', 400);
    }
    const cls = await academicRepository.updateClass(schoolId, id, { status: 'INACTIVE' });
    return cls.toPublicJSON();
  }

  async seedDefaultClasses(schoolId) {
    const { total } = await academicRepository.listClasses(schoolId, { limit: 1 });
    if (total > 0) return { message: 'Classes already exist', created: 0 };

    const created = await Promise.all(
      DEFAULT_CLASSES.map((item) =>
        academicRepository.createClass({
          schoolId,
          ...item,
          description: '',
          status: 'ACTIVE',
        })
      )
    );
    return { message: 'Default classes created', created: created.length };
  }

  async listYearClasses(schoolId, academicYearId) {
    await assertYear(schoolId, academicYearId);
    const mappings = await academicRepository.listYearClasses(schoolId, academicYearId);
    if (!mappings.length) return [];

    const classIds = mappings.map((m) => m.classId);

    // Fetch classes and aggregate counts concurrently in 4 queries instead of 60+ queries
    const [classes, sectionCountsMap, studentCountsMap, subjectCountsMap] = await Promise.all([
      academicRepository.findClassesByIds(schoolId, classIds),
      academicRepository.countSectionsByClassMap(schoolId, academicYearId),
      academicRepository.countEnrollmentsByClassMap(schoolId, academicYearId),
      academicRepository.countSectionSubjectsByClassMap(schoolId, academicYearId),
    ]);

    const classMap = new Map(classes.map((c) => [c._id.toString(), c.toPublicJSON()]));

    const data = mappings.map((mapping) => {
      const cId = mapping.classId.toString();
      const cls = classMap.get(cId) || null;
      return {
        ...mapping.toPublicJSON(),
        class: cls,
        counts: {
          sections: sectionCountsMap.get(cId) || 0,
          students: studentCountsMap.get(cId) || 0,
          subjectAssignments: subjectCountsMap.get(cId) || 0,
        },
      };
    });

    return data.sort((a, b) => (a.class?.numericOrder || 0) - (b.class?.numericOrder || 0));
  }

  async addClassToYear(schoolId, academicYearId, classId) {
    const year = await assertYear(schoolId, academicYearId);
    if (year.status === 'ARCHIVED') throw new AppError('Cannot add classes to an archived academic year', 400);
    await assertClass(schoolId, classId);

    const existing = await academicRepository.findYearClass(schoolId, academicYearId, classId);
    if (existing) throw new AppError('Class is already added to this academic year', 409);

    try {
      const mapping = await academicRepository.createYearClass({
        schoolId,
        academicYearId,
        classId,
        status: 'ACTIVE',
      });
      const cls = await academicRepository.findClassById(schoolId, classId);
      return { ...mapping.toPublicJSON(), class: cls.toPublicJSON() };
    } catch (error) {
      mapMongoError(error);
    }
  }

  async removeClassFromYear(schoolId, academicYearId, classId) {
    await assertYear(schoolId, academicYearId);
    const sections = await academicRepository.countSectionsForClass(schoolId, academicYearId, classId);
    if (sections > 0) {
      throw new AppError('Remove all sections before removing class from academic year', 400);
    }
    const removed = await academicRepository.deleteYearClass(schoolId, academicYearId, classId);
    if (!removed) throw new AppError('Class mapping not found', 404);
    return { message: 'Class removed from academic year' };
  }

  async listSections(schoolId, filters) {
    if (filters.academicYearId) await assertYear(schoolId, filters.academicYearId);
    if (filters.classId) await assertClass(schoolId, filters.classId);

    const sections = await academicRepository.listSections(schoolId, filters);
    if (!sections.length) return [];

    const sectionIds = sections.map((s) => s._id);
    const teacherIds = [...new Set(sections.map((s) => s.classTeacherId).filter(Boolean))];

    // Concurrently aggregate counts and teacher records in 3 queries instead of 90+ queries
    const [studentCountsMap, subjectCountsMap, teachers] = await Promise.all([
      academicRepository.countEnrollmentsBySectionMap(schoolId, sectionIds),
      academicRepository.countSectionSubjectsBySectionMap(schoolId, sectionIds),
      academicRepository.findTeachersByIds(schoolId, teacherIds),
    ]);

    const teacherMap = new Map(teachers.map((t) => [t._id.toString(), t.toPublicJSON()]));

    return sections.map((section) => {
      const sId = section._id.toString();
      const tId = section.classTeacherId ? section.classTeacherId.toString() : null;
      const classTeacher = tId ? teacherMap.get(tId) || null : null;
      return {
        ...section.toPublicJSON(),
        classTeacher,
        counts: {
          students: studentCountsMap.get(sId) || 0,
          subjects: subjectCountsMap.get(sId) || 0,
        },
      };
    });
  }

  async getSection(schoolId, id) {
    const section = await assertSection(schoolId, id);
    const json = section.toPublicJSON();
    const [year, cls, classTeacher, students, subjects] = await Promise.all([
      academicRepository.findYearById(schoolId, section.academicYearId),
      academicRepository.findClassById(schoolId, section.classId),
      section.classTeacherId
        ? academicRepository.findTeacherById(schoolId, section.classTeacherId)
        : null,
      academicRepository.countEnrollments(schoolId, { sectionId: section._id }),
      academicRepository.countSectionSubjects(schoolId, { sectionId: section._id }),
    ]);
    return {
      ...json,
      academicYear: year ? year.toPublicJSON() : null,
      class: cls ? cls.toPublicJSON() : null,
      classTeacher: classTeacher ? classTeacher.toPublicJSON() : null,
      counts: { students, subjects, capacity: section.capacity },
    };
  }

  async createSection(schoolId, payload) {
    const academicYearId = payload.academicYearId;
    const classId = payload.classId;
    const year = await assertYear(schoolId, academicYearId);
    if (year.status === 'ARCHIVED') throw new AppError('Cannot create sections in an archived academic year', 400);
    await assertClass(schoolId, classId);

    const mapping = await academicRepository.findYearClass(schoolId, academicYearId, classId);
    if (!mapping) throw new AppError('Class must be added to the academic year first', 400);

    const name = requireText(payload.name, 'Section name');
    const capacity = Number(payload.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new AppError('Capacity must be a positive integer', 400);
    }

    let classTeacherId = null;
    if (payload.classTeacherId) {
      await assertTeacher(schoolId, payload.classTeacherId);
      const alreadyAssigned = await academicRepository.findSectionWithClassTeacher(
        schoolId,
        academicYearId,
        payload.classTeacherId
      );
      if (alreadyAssigned) {
        throw new AppError('This teacher is already assigned as a class teacher to another section in this academic year', 400);
      }
      classTeacherId = payload.classTeacherId;
    }

    try {
      const section = await academicRepository.createSection({
        schoolId,
        academicYearId,
        classId,
        name,
        code: optionalText(payload.code).toUpperCase(),
        capacity,
        roomNumber: optionalText(payload.roomNumber),
        classTeacherId,
        status: payload.status ? ensureOption(payload.status, ENTITY_STATUSES, 'Status') : 'ACTIVE',
      });
      return section.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
    }
  }

  async updateSection(schoolId, id, payload) {
    const section = await assertSection(schoolId, id);
    const update = {};
    if (payload.name !== undefined) update.name = requireText(payload.name, 'Section name');
    if (payload.code !== undefined) update.code = optionalText(payload.code).toUpperCase();
    if (payload.capacity !== undefined) {
      const capacity = Number(payload.capacity);
      if (!Number.isInteger(capacity) || capacity < 1) {
        throw new AppError('Capacity must be a positive integer', 400);
      }
      update.capacity = capacity;
    }
    if (payload.roomNumber !== undefined) update.roomNumber = optionalText(payload.roomNumber);
    if (payload.classTeacherId !== undefined) {
      if (payload.classTeacherId) {
        await assertTeacher(schoolId, payload.classTeacherId);
        const alreadyAssigned = await academicRepository.findSectionWithClassTeacher(
          schoolId,
          section.academicYearId,
          payload.classTeacherId,
          section._id
        );
        if (alreadyAssigned) {
          throw new AppError('This teacher is already assigned as a class teacher to another section in this academic year', 400);
        }
        update.classTeacherId = payload.classTeacherId;
      } else {
        update.classTeacherId = null;
      }
    }
    if (payload.status !== undefined) update.status = ensureOption(payload.status, ENTITY_STATUSES, 'Status');

    try {
      const updated = await academicRepository.updateSection(schoolId, section._id, update);
      return updated.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
    }
  }

  async deleteSection(schoolId, id) {
    await assertSection(schoolId, id);
    const hasDeps = await academicRepository.sectionHasDependents(schoolId, id);
    if (hasDeps) {
      throw new AppError('Cannot delete section with students or subject assignments. Set status to inactive instead.', 400);
    }
    const section = await academicRepository.updateSection(schoolId, id, { status: 'INACTIVE' });
    return section.toPublicJSON();
  }

  async listSubjects(schoolId, filters) {
    const { items, total, page, limit } = await academicRepository.listSubjects(schoolId, filters);
    return {
      data: items.map((item) => item.toPublicJSON()),
      pagination: paginationMeta({ total, page, limit }),
    };
  }

  async createSubject(schoolId, payload) {
    const name = requireText(payload.name, 'Subject name');
    const code = requireText(payload.code || name.slice(0, 4), 'Subject code').toUpperCase();
    const maxMarks = Number(payload.maxMarks ?? 100);
    const passingMarks = Number(payload.passingMarks ?? 33);
    if (!Number.isFinite(maxMarks) || maxMarks < 1) throw new AppError('Maximum marks must be at least 1', 400);
    if (!Number.isFinite(passingMarks) || passingMarks < 0) {
      throw new AppError('Passing marks must be zero or more', 400);
    }

    try {
      const subject = await academicRepository.createSubject({
        schoolId,
        name,
        code,
        subjectType: payload.subjectType
          ? ensureOption(payload.subjectType, SUBJECT_TYPES, 'Subject type')
          : 'THEORY',
        maxMarks,
        passingMarks,
        description: optionalText(payload.description),
        status: payload.status ? ensureOption(payload.status, ENTITY_STATUSES, 'Status') : 'ACTIVE',
      });
      return subject.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
    }
  }

  async updateSubject(schoolId, id, payload) {
    await assertSubject(schoolId, id);
    const update = {};
    if (payload.name !== undefined) update.name = requireText(payload.name, 'Subject name');
    if (payload.code !== undefined) update.code = requireText(payload.code, 'Subject code').toUpperCase();
    if (payload.subjectType !== undefined) {
      update.subjectType = ensureOption(payload.subjectType, SUBJECT_TYPES, 'Subject type');
    }
    if (payload.maxMarks !== undefined) update.maxMarks = Number(payload.maxMarks);
    if (payload.passingMarks !== undefined) update.passingMarks = Number(payload.passingMarks);
    if (payload.description !== undefined) update.description = optionalText(payload.description);
    if (payload.status !== undefined) update.status = ensureOption(payload.status, ENTITY_STATUSES, 'Status');

    try {
      const subject = await academicRepository.updateSubject(schoolId, id, update);
      return subject.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
    }
  }

  async deleteSubject(schoolId, id) {
    await assertSubject(schoolId, id);
    const subject = await academicRepository.updateSubject(schoolId, id, { status: 'INACTIVE' });
    return subject.toPublicJSON();
  }

  async listAllSectionSubjects(schoolId, filters = {}) {
    if (filters.academicYearId) await assertYear(schoolId, filters.academicYearId);
    if (filters.classId) await assertClass(schoolId, filters.classId);
    if (filters.sectionId) await assertSection(schoolId, filters.sectionId);

    const items = await academicRepository.listAllSectionSubjects(schoolId, filters);
    const data = await Promise.all(
      items.map(async (item) => {
        const [subject, teacher, section, schoolClass, academicYear] = await Promise.all([
          academicRepository.findSubjectById(schoolId, item.subjectId),
          item.teacherId ? academicRepository.findTeacherById(schoolId, item.teacherId) : null,
          academicRepository.findSectionById(schoolId, item.sectionId),
          academicRepository.findClassById(schoolId, item.classId),
          academicRepository.findYearById(schoolId, item.academicYearId),
        ]);
        return {
          ...item.toPublicJSON(),
          subject: subject ? subject.toPublicJSON() : null,
          teacher: teacher ? teacher.toPublicJSON() : null,
          section: section
            ? {
                id: section._id.toString(),
                name: section.name,
                classId: section.classId.toString(),
                academicYearId: section.academicYearId.toString(),
              }
            : null,
          class: schoolClass
            ? {
                id: schoolClass._id.toString(),
                name: schoolClass.name,
                code: schoolClass.code,
              }
            : null,
          academicYear: academicYear
            ? {
                id: academicYear._id.toString(),
                name: academicYear.name,
                code: academicYear.code,
                isCurrent: academicYear.isCurrent,
              }
            : null,
        };
      })
    );
    return data;
  }

  async listSectionSubjects(schoolId, sectionId) {
    const section = await assertSection(schoolId, sectionId);
    const items = await academicRepository.listSectionSubjects(schoolId, sectionId);
    const data = await Promise.all(
      items.map(async (item) => {
        const [subject, teacher] = await Promise.all([
          academicRepository.findSubjectById(schoolId, item.subjectId),
          item.teacherId ? academicRepository.findTeacherById(schoolId, item.teacherId) : null,
        ]);
        return {
          ...item.toPublicJSON(),
          subject: subject ? subject.toPublicJSON() : null,
          teacher: teacher ? teacher.toPublicJSON() : null,
          section: {
            id: section._id.toString(),
            name: section.name,
            classId: section.classId.toString(),
            academicYearId: section.academicYearId.toString(),
          },
        };
      })
    );
    return data;
  }

  async createSectionSubjectDirect(schoolId, payload) {
    if (!payload.sectionId) throw new AppError('Section is required', 400);
    return this.addSectionSubject(schoolId, payload.sectionId, payload);
  }

  async addSectionSubject(schoolId, sectionId, payload) {
    const section = await assertSection(schoolId, sectionId);
    const subject = await assertSubject(schoolId, payload.subjectId);
    if (payload.teacherId) await assertTeacher(schoolId, payload.teacherId);

    const duplicate = await academicRepository.findSectionSubjectDuplicate(
      schoolId,
      sectionId,
      payload.subjectId
    );
    if (duplicate) throw new AppError('This subject is already assigned to the section', 409);

    const maxMarks = Number(payload.maxMarks ?? subject.maxMarks ?? 100);
    const passingMarks = Number(payload.passingMarks ?? subject.passingMarks ?? 33);

    try {
      const item = await academicRepository.createSectionSubject({
        schoolId,
        academicYearId: section.academicYearId,
        classId: section.classId,
        sectionId: section._id,
        subjectId: payload.subjectId,
        teacherId: payload.teacherId || null,
        maxMarks,
        passingMarks,
        isOptional: Boolean(payload.isOptional),
        status: payload.status ? ensureOption(payload.status, ENTITY_STATUSES, 'Status') : 'ACTIVE',
      });
      return item.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
    }
  }

  async updateSectionSubject(schoolId, id, payload) {
    const item = await academicRepository.findSectionSubjectById(schoolId, id);
    if (!item) throw new AppError('Section subject assignment not found', 404);
    if (payload.teacherId) await assertTeacher(schoolId, payload.teacherId);

    const update = {};
    if (payload.teacherId !== undefined) update.teacherId = payload.teacherId || null;
    if (payload.maxMarks !== undefined) update.maxMarks = Number(payload.maxMarks);
    if (payload.passingMarks !== undefined) update.passingMarks = Number(payload.passingMarks);
    if (payload.isOptional !== undefined) update.isOptional = Boolean(payload.isOptional);
    if (payload.status !== undefined) update.status = ensureOption(payload.status, ENTITY_STATUSES, 'Status');

    const updated = await academicRepository.updateSectionSubject(schoolId, id, update);
    return updated.toPublicJSON();
  }

  async deleteSectionSubject(schoolId, id) {
    const removed = await academicRepository.deleteSectionSubject(schoolId, id);
    if (!removed) throw new AppError('Section subject assignment not found', 404);
    return { message: 'Subject removed from section' };
  }

  async listTeachers(schoolId, filters) {
    const teachers = await academicRepository.listTeachers(schoolId, filters);
    return Promise.all(
      teachers.map(async (teacher) => {
        const counts = await academicRepository.teacherAssignmentCounts(schoolId, teacher._id);
        return { ...teacher.toPublicJSON(), counts };
      })
    );
  }

  async createTeacher(schoolId, payload, files = {}) {
    const photo = files.photo || null;
    try {
      const teacherPayload = sanitizeTeacherPayload(payload);
      if (!teacherPayload.gender) throw new AppError('Gender is required', 400);
      if (!teacherPayload.mobileNumber) throw new AppError('Mobile number is required', 400);
      if (!teacherPayload.employeeId) throw new AppError('Employee ID is required', 400);
      if (!teacherPayload.joiningDate) throw new AppError('Joining date is required', 400);
      if (!teacherPayload.qualifications.length) throw new AppError('Qualification is required', 400);
      teacherPayload.documents = mergeDocumentUploads(payload.documentsKeep, null, files);
      const teacher = await academicRepository.createTeacher({
        schoolId,
        ...teacherPayload,
        profilePhoto: photo ? toTeacherPhotoPublicPath(photo.filename) : '',
      });
      const counts = await academicRepository.teacherAssignmentCounts(schoolId, teacher._id);
      return { ...teacher.toPublicJSON(), counts };
    } catch (error) {
      cleanupTeacherUploadFiles(files);
      mapMongoError(error);
    }
  }

  async getTeacher(schoolId, id) {
    const teacher = await assertTeacher(schoolId, id);
    const counts = await academicRepository.teacherAssignmentCounts(schoolId, teacher._id);
    return { ...teacher.toPublicJSON(), counts };
  }

  async updateTeacher(schoolId, id, payload, files = {}) {
    const existing = await assertTeacher(schoolId, id);
    const update = sanitizeTeacherPayload(payload, existing);
    const photo = files.photo || null;
    const shouldRemovePhoto = isTruthyFlag(payload.removePhoto);
    if (photo) update.profilePhoto = toTeacherPhotoPublicPath(photo.filename);
    else if (shouldRemovePhoto) update.profilePhoto = '';
    update.documents = mergeDocumentUploads(payload.documentsKeep, existing.documents, files);

    try {
      const teacher = await academicRepository.updateTeacher(schoolId, id, update);
      if ((photo || shouldRemovePhoto) && existing.profilePhoto && existing.profilePhoto !== update.profilePhoto) {
        deleteUploadedFile(existing.profilePhoto);
      }
      deleteRemovedDocuments(existing.documents, update.documents);
      const counts = await academicRepository.teacherAssignmentCounts(schoolId, teacher._id);
      return { ...teacher.toPublicJSON(), counts };
    } catch (error) {
      cleanupTeacherUploadFiles(files);
      mapMongoError(error);
    }
  }

  async updateTeacherStatus(schoolId, id, status) {
    await assertTeacher(schoolId, id);
    const nextStatus = ensureOption(status, TEACHER_STATUSES, 'Status');
    const teacher = await academicRepository.updateTeacher(schoolId, id, { status: nextStatus });
    const counts = await academicRepository.teacherAssignmentCounts(schoolId, teacher._id);
    return { ...teacher.toPublicJSON(), counts };
  }

  async deleteTeacher(schoolId, id) {
    const teacher = await assertTeacher(schoolId, id);
    const hasDeps = await academicRepository.teacherHasDependents(schoolId, teacher._id);
    if (hasDeps) {
      throw new AppError('Cannot delete teacher with class or subject assignments. Deactivate instead.', 400);
    }
    await academicRepository.deleteTeacher(schoolId, teacher._id);
    if (teacher.profilePhoto) deleteUploadedFile(teacher.profilePhoto);
    collectDocumentPaths(teacher.documents).forEach(deleteUploadedFile);
    return { message: 'Teacher deleted successfully' };
  }
}

export const academicService = new AcademicService();
