import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { School } from '../models/School.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { studentService } from './student.service.js';

const MAX_PRINT_ALL = 500;

const isId = (value) => mongoose.isValidObjectId(String(value || ''));

const HEX = /^#[0-9a-f]{6}$/i;
const FIELD_KEYS = ['rollNo', 'phone', 'dob', 'parent', 'house', 'address', 'gender'];
const COLOR_KEYS = ['primaryColor', 'accentColor', 'textColor', 'headerTextColor', 'cardBg', 'borderColor'];
// '' means "derive automatically from the main color".
const OPTIONAL_COLOR_KEYS = ['secondaryColor', 'footerBg'];
const ENUMS = {
  template: ['classic', 'modern', 'minimal', 'bold', 'custom'],
  orientation: ['vertical', 'horizontal'],
  headerStyle: ['curved', 'flat', 'wave', 'slant'],
  logoPosition: ['badge', 'header', 'none'],
  logoShape: ['circle', 'square'],
  photoShape: ['circle', 'rounded', 'square'],
  photoSize: ['s', 'm', 'l'],
  schoolNameSize: ['s', 'm', 'l'],
  nameSize: ['s', 'm', 'l'],
  nameFont: ['serif', 'sans'],
  nameCase: ['upper', 'title'],
  classStyle: ['pill', 'outline', 'text', 'hidden'],
  cornerRadius: ['s', 'm', 'l'],
  pattern: ['none', 'dots', 'grid', 'lines'],
  footerLeft: ['phone', 'website', 'email', 'none'],
  footerRight: ['session', 'validTill', 'none'],
};
const BOOL_KEYS = ['lanyardSlot', 'headerGradient', 'showAddress', 'photoRing', 'showIcons', 'showBorder', 'signature', 'backSide'];
const TEXT_KEYS = { cardTitle: 30, tagline: 60, signatureLabel: 30, backText: 240 };

// Only known keys with valid values are stored; anything else is dropped.
function sanitizeDesign(input = {}) {
  const design = {};
  for (const key of COLOR_KEYS) {
    if (typeof input[key] === 'string' && HEX.test(input[key])) design[key] = input[key];
  }
  for (const key of OPTIONAL_COLOR_KEYS) {
    if (typeof input[key] === 'string' && (input[key] === '' || HEX.test(input[key]))) design[key] = input[key];
  }
  for (const [key, options] of Object.entries(ENUMS)) {
    if (options.includes(input[key])) design[key] = input[key];
  }
  for (const key of BOOL_KEYS) {
    if (typeof input[key] === 'boolean') design[key] = input[key];
  }
  for (const [key, max] of Object.entries(TEXT_KEYS)) {
    if (typeof input[key] === 'string') design[key] = input[key].trim().slice(0, max);
  }
  if (input.fields && typeof input.fields === 'object') {
    design.fields = {};
    for (const key of FIELD_KEYS) {
      if (typeof input.fields[key] === 'boolean') design.fields[key] = input.fields[key];
    }
  }
  return design;
}

class IdCardService {
  async saveDesign(schoolId, input) {
    const design = sanitizeDesign(input);
    await School.updateOne({ _id: schoolId }, { $set: { 'settings.idCardDesign': design } });
    return design;
  }

  /**
   * Everything the ID-card page needs before a class is picked: the school's
   * own branding (printed on every card) and the year/class/section tree.
   */
  async options(schoolId) {
    const [school, years, classes, sections] = await Promise.all([
      School.findById(schoolId).select('name code logo website contact address settings.primaryColor settings.portalBranding settings.idCardDesign').lean(),
      AcademicYear.find({ schoolId }).sort({ startDate: -1 }).lean(),
      SchoolClass.find({ schoolId }).sort({ numericOrder: 1, name: 1 }).lean(),
      Section.find({ schoolId }).sort({ name: 1 }).lean(),
    ]);
    if (!school) throw new AppError('School not found', 404);

    const address = school.address || {};
    return {
      school: {
        name: school.name,
        code: school.code,
        logo: school.settings?.portalBranding?.logo || school.logo || '',
        website: school.website || '',
        phone: school.contact?.phone || '',
        email: school.contact?.email || '',
        address: [address.line1, address.line2, address.city, address.state, address.pincode]
          .filter(Boolean)
          .join(', '),
        primaryColor: school.settings?.primaryColor || '#4F46E5',
      },
      design: school.settings?.idCardDesign || null,
      academicYears: years.map((year) => ({
        id: String(year._id),
        name: year.name,
        isCurrent: Boolean(year.isCurrent),
        endDate: year.endDate || null,
      })),
      classes: classes.map((cls) => ({
        id: String(cls._id),
        name: cls.name,
        academicYearId: cls.academicYearId ? String(cls.academicYearId) : null,
      })),
      sections: sections.map((section) => ({
        id: String(section._id),
        name: section.name,
        classId: String(section.classId),
        academicYearId: String(section.academicYearId),
      })),
    };
  }

  /**
   * Active students, card-ready, filtered by year / class / section / search.
   * Paged for the on-screen grid; `all=1` returns every match (capped) so the
   * whole result can be printed in one go.
   */
  async students(schoolId, query = {}) {
    const { academicYearId, classId, sectionId, search } = query;
    for (const [label, value] of [['Academic year', academicYearId], ['Class', classId], ['Section', sectionId]]) {
      if (value && !isId(value)) throw new AppError(`${label} is invalid`, 400);
    }

    const filters = { status: 'ACTIVE' };
    if (academicYearId) filters.academicYearId = academicYearId;
    if (classId) filters.classId = classId;
    if (sectionId) filters.sectionId = sectionId;
    if (search) filters.search = String(search).slice(0, 80);

    const toCard = (student) => ({
      id: student.id,
      name: student.name,
      admissionNumber: student.admissionNumber,
      rollNumber: student.enrollment?.rollNumber || '',
      photo: student.photo || '',
      gender: student.gender,
      dateOfBirth: student.dateOfBirth || null,
      className: student.enrollment?.class?.name || '',
      sectionName: student.enrollment?.section?.name || '',
      academicYear: student.enrollment?.academicYear?.name || '',
      validTill: student.enrollment?.academicYear?.endDate || null,
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      address: [student.address, student.village, student.city, student.state].filter(Boolean).join(', '),
      house: student.house || '',
    });

    if (query.all === '1' || query.all === 1 || query.all === true || query.all === 'true') {
      const students = await studentService.listStudents(schoolId, filters);
      const rows = students.slice(0, MAX_PRINT_ALL).map(toCard);
      return { data: rows, pagination: { page: 1, limit: rows.length, total: students.length, totalPages: 1 } };
    }

    const result = await studentService.listStudentsPage(schoolId, {
      ...filters,
      page: query.page,
      limit: Math.min(60, parseInt(query.limit, 10) || 24),
    });
    return { data: result.data.map(toCard), pagination: result.pagination };
  }
}

export const idCardService = new IdCardService();
