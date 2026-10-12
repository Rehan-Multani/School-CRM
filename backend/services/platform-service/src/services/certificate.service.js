import { sanitizeLayout } from '../utils/certificateLayout.js';
import { buildDefaultTemplates } from '../utils/certificateStarterTemplates.js';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { School } from '../models/School.js';
import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { nextSequence } from '../models/Counter.js';
import {
  CertificateTemplate,
  CERTIFICATE_TYPES,
  CERTIFICATE_APPLICABLE,
  CERTIFICATE_STATUSES,
} from '../models/CertificateTemplate.js';
import { IssuedCertificate } from '../models/IssuedCertificate.js';
import { studentService } from './student.service.js';
import { idCardService } from './idCard.service.js';
import { TimetableEntry, TIMETABLE_DAYS } from '../models/TimetableEntry.js';
import { Section } from '../models/Section.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { FeeStructure } from '../models/FeeStructure.js';
import { FeeStructureItem } from '../models/FeeStructureItem.js';
import { FeeHead } from '../models/FeeHead.js';

const MAX_ISSUE_BATCH = 200;
const MAX_SIGNATURE_CHARS = 450_000; // ~330 KB image once base64-decoded
const HEX = /^#[0-9a-f]{6}$/i;

const isId = (value) => mongoose.isValidObjectId(String(value || ''));

const ENUMS = {
  orientation: ['landscape', 'portrait'],
  borderStyle: ['ornate', 'double', 'classic', 'modern', 'none'],
  titleFont: ['serif', 'script', 'sans'],
  nameStyle: ['script', 'serif', 'sans'],
  textSize: ['s', 'm', 'l'],
};
const COLOR_KEYS = ['primaryColor', 'accentColor', 'textColor', 'backgroundColor'];
const BOOL_KEYS = ['showLogo', 'showSeal', 'showQr', 'showRecipientBlock', 'showWatermark', 'secondSignatory'];

// Only known keys with valid values are stored.
function sanitizeDesign(input = {}) {
  const design = {};
  for (const [key, options] of Object.entries(ENUMS)) {
    if (options.includes(input[key])) design[key] = input[key];
  }
  for (const key of COLOR_KEYS) {
    if (typeof input[key] === 'string' && HEX.test(input[key])) design[key] = input[key];
  }
  for (const key of BOOL_KEYS) {
    if (typeof input[key] === 'boolean') design[key] = input[key];
  }
  if (typeof input.secondSignatoryLabel === 'string') {
    design.secondSignatoryLabel = input.secondSignatoryLabel.trim().slice(0, 40);
  }
  if (typeof input.preset === 'string') design.preset = input.preset.slice(0, 30);
  if (input.layout) {
    const layout = sanitizeLayout(input.layout);
    if (!layout) throw new AppError('The design is invalid or too large. Remove some images and try again.', 400);
    design.layout = layout;
  }
  return design;
}

function requireText(value, label, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  if (text.length > max) throw new AppError(`${label} must be ${max} characters or fewer`, 400);
  return text;
}

function optionalText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanSignature(value) {
  if (value === undefined || value === null || value === '') return '';
  const text = String(value);
  if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(text)) {
    throw new AppError('Signature must be a PNG, JPG or WEBP image', 400);
  }
  if (text.length > MAX_SIGNATURE_CHARS) throw new AppError('Signature image is too large (max ~300 KB)', 400);
  return text;
}

function parseDate(value, label, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new AppError(`${label} is required`, 400);
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new AppError(`${label} is not a valid date`, 400);
  return date;
}

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

function render(text, variables) {
  return String(text || '').replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

function mapDuplicate(error) {
  if (error?.code === 11000) throw new AppError('A certificate template with this name already exists', 409);
  throw error;
}

class CertificateService {
  /* ------------------------------ templates ------------------------------ */

  /**
   * Adds the ready-made designs this school does not have yet (matched by name).
   * Idempotent; returns how many were created.
   */
  async seedDefaults(schoolId, actor = 'System') {
    const existing = new Set((await CertificateTemplate.find({ schoolId }).select('name').lean()).map((t) => t.name));
    const rows = buildDefaultTemplates().filter((t) => !existing.has(t.name));
    let created = 0;
    for (const row of rows) {
      try {
        await CertificateTemplate.create({ ...row, schoolId, createdBy: actor, updatedBy: actor });
        created += 1;
      } catch (err) {
        if (err?.code !== 11000) throw err; // a template with that name appeared meanwhile
      }
    }
    await School.updateOne({ _id: schoolId }, { $set: { 'settings.certificateTemplatesSeeded': true } });
    return { created, total: rows.length };
  }

  async listTemplates(schoolId, query = {}) {
    // First visit of a school that has never had templates: give it the starter set.
    if (!query.search && !query.status && !query.type && !query.applicableTo) {
      const [count, school] = await Promise.all([
        CertificateTemplate.countDocuments({ schoolId }),
        School.findById(schoolId).select('settings.certificateTemplatesSeeded').lean(),
      ]);
      if (count === 0 && !school?.settings?.certificateTemplatesSeeded) await this.seedDefaults(schoolId);
    }
    const filter = { schoolId };
    if (CERTIFICATE_STATUSES.includes(query.status)) filter.status = query.status;
    if (CERTIFICATE_TYPES.includes(query.type)) filter.type = query.type;
    if (query.applicableTo && CERTIFICATE_APPLICABLE.includes(query.applicableTo)) filter.applicableTo = query.applicableTo;
    if (query.search) {
      const term = new RegExp(escapeRegex(String(query.search).trim()), 'i');
      filter.$or = [{ name: term }, { title: term }];
    }
    const [templates, counts] = await Promise.all([
      CertificateTemplate.find(filter).sort({ updatedAt: -1 }),
      IssuedCertificate.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(String(schoolId)), status: 'ISSUED' } },
        { $group: { _id: '$templateId', count: { $sum: 1 } } },
      ]),
    ]);
    const issued = new Map(counts.map((row) => [String(row._id), row.count]));
    return templates.map((template) => ({ ...template.toPublicJSON(), issuedCount: issued.get(String(template._id)) || 0 }));
  }

  buildTemplateFields(payload, { partial = false } = {}) {
    const fields = {};
    const has = (key) => payload[key] !== undefined;
    if (!partial || has('name')) fields.name = requireText(payload.name, 'Certificate name', 120);
    if (!partial || has('title')) fields.title = requireText(payload.title, 'Certificate title', 120);
    if (!partial || has('text')) fields.text = requireText(payload.text, 'Certificate text', 1500);
    if (!partial || has('type')) {
      if (!CERTIFICATE_TYPES.includes(payload.type)) throw new AppError('Select a certificate type', 400);
      fields.type = payload.type;
    }
    if (!partial || has('applicableTo')) {
      const value = payload.applicableTo || 'STUDENT';
      if (!CERTIFICATE_APPLICABLE.includes(value)) throw new AppError('Applicable to is invalid', 400);
      fields.applicableTo = value;
    }
    if (has('signatoryName')) fields.signatoryName = optionalText(payload.signatoryName, 80);
    if (has('designation')) fields.designation = optionalText(payload.designation, 80);
    if (has('signatureImage')) fields.signatureImage = cleanSignature(payload.signatureImage);
    if (has('design')) fields.design = sanitizeDesign(payload.design || {});
    if (has('status')) {
      if (!CERTIFICATE_STATUSES.includes(payload.status)) throw new AppError('Status is invalid', 400);
      fields.status = payload.status;
    }
    return fields;
  }

  /** Weekly grid of one section, for a timetable design. */
  async timetableData(schoolId, sectionId) {
    if (!isId(sectionId)) throw new AppError('Select a class and section', 400);
    const section = await Section.findOne({ _id: sectionId, schoolId }).select('name classId').lean();
    if (!section) throw new AppError('Section not found', 404);
    const cls = await SchoolClass.findOne({ _id: section.classId, schoolId }).select('name').lean();
    const rows = await TimetableEntry.find({ schoolId, sectionId, status: 'ACTIVE' }).sort({ periodNumber: 1 }).lean();

    const periodMap = new Map();
    const cells = {};
    const usedDays = new Set();
    for (const r of rows) {
      if (!periodMap.has(r.periodNumber)) periodMap.set(r.periodNumber, { number: r.periodNumber, start: r.startTime, end: r.endTime });
      cells[`${r.dayOfWeek}-${r.periodNumber}`] = { subject: r.subjectName || '', teacher: r.teacherName || '', room: r.room || '' };
      usedDays.add(r.dayOfWeek);
    }
    const dayNames = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
    const days = TIMETABLE_DAYS.filter((d) => usedDays.has(d) || d !== 'SAT').map((d) => ({ key: d, label: dayNames[d] }));
    return {
      className: cls?.name || '',
      sectionName: section.name || '',
      days,
      periods: [...periodMap.values()].sort((a, b) => a.number - b.number),
      cells,
    };
  }

  /** Fee heads of a class for one academic year, for a fee structure design. */
  async feeStructureData(schoolId, classId, academicYearId) {
    if (!isId(classId)) throw new AppError('Select a class', 400);
    const cls = await SchoolClass.findOne({ _id: classId, schoolId }).select('name').lean();
    if (!cls) throw new AppError('Class not found', 404);
    const filter = { schoolId, classId, status: 'ACTIVE' };
    if (isId(academicYearId)) filter.academicYearId = academicYearId;
    const structures = await FeeStructure.find(filter).sort({ createdAt: -1 }).lean();
    const year = structures[0]?.academicYearId
      ? await AcademicYear.findOne({ _id: structures[0].academicYearId, schoolId }).select('name').lean()
      : null;
    const ids = structures.map((s) => s._id);
    const items = ids.length ? await FeeStructureItem.find({ schoolId, feeStructureId: { $in: ids } }).lean() : [];
    const heads = items.length
      ? await FeeHead.find({ _id: { $in: items.map((i) => i.feeHeadId) } }).select('name').lean()
      : [];
    const headName = new Map(heads.map((h) => [String(h._id), h.name]));
    const rows = items.map((i) => ({
      head: headName.get(String(i.feeHeadId)) || 'Fee',
      frequency: i.frequency,
      amount: Number(i.amount) || 0,
      optional: Boolean(i.isOptional),
    }));
    return {
      className: cls.name,
      academicYear: year?.name || '',
      structureName: structures[0]?.name || '',
      items: rows,
      total: rows.filter((r) => !r.optional).reduce((sum, r) => sum + r.amount, 0),
    };
  }

  async createTemplate(schoolId, payload, actor) {
    const fields = this.buildTemplateFields(payload || {});
    try {
      const template = await CertificateTemplate.create({
        ...fields,
        status: fields.status || 'DRAFT',
        schoolId,
        createdBy: actor,
        updatedBy: actor,
      });
      return { ...template.toPublicJSON(), issuedCount: 0 };
    } catch (error) {
      return mapDuplicate(error);
    }
  }

  async updateTemplate(schoolId, id, payload, actor) {
    if (!isId(id)) throw new AppError('Template not found', 404);
    const template = await CertificateTemplate.findOne({ _id: id, schoolId });
    if (!template) throw new AppError('Template not found', 404);
    template.set({ ...this.buildTemplateFields(payload || {}, { partial: true }), updatedBy: actor });
    try {
      await template.save();
    } catch (error) {
      return mapDuplicate(error);
    }
    return template.toPublicJSON();
  }

  async deleteTemplate(schoolId, id) {
    if (!isId(id)) throw new AppError('Template not found', 404);
    const template = await CertificateTemplate.findOne({ _id: id, schoolId });
    if (!template) throw new AppError('Template not found', 404);
    const used = await IssuedCertificate.exists({ schoolId, templateId: id });
    if (used) {
      throw new AppError('Certificates were already issued from this template. Keep it as Draft instead of deleting.', 409);
    }
    await template.deleteOne();
    return { id };
  }

  /* ------------------------------ recipients ----------------------------- */

  /** People a certificate can be issued to, in one shape for all three kinds. */
  async recipients(schoolId, query = {}) {
    const type = CERTIFICATE_APPLICABLE.includes(query.type) ? query.type : 'STUDENT';
    const limit = Math.min(60, Math.max(1, parseInt(query.limit, 10) || 30));
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const search = String(query.search || '').trim().slice(0, 80);

    if (type === 'STUDENT') {
      const result = await idCardService.students(schoolId, {
        academicYearId: query.academicYearId,
        classId: query.classId,
        sectionId: query.sectionId,
        search,
        page,
        limit,
      });
      return {
        data: result.data.map((s) => ({
          id: s.id,
          type: 'STUDENT',
          name: s.name,
          ref: s.admissionNumber,
          subtitle: [s.className, s.sectionName].filter(Boolean).join(' - '),
        })),
        pagination: result.pagination,
      };
    }

    const term = search ? new RegExp(escapeRegex(search), 'i') : null;
    if (type === 'TEACHER') {
      const filter = { schoolId, status: 'ACTIVE' };
      if (term) {
        filter.$or = [{ firstName: term }, { lastName: term }, { employeeId: term }];
      }
      const [rows, total] = await Promise.all([
        Teacher.find(filter).sort({ firstName: 1 }).skip((page - 1) * limit).limit(limit),
        Teacher.countDocuments(filter),
      ]);
      return {
        data: rows.map((row) => {
          const json = row.toPublicJSON();
          return { id: json.id, type: 'TEACHER', name: json.name, ref: json.employeeId, subtitle: json.designation || 'Teacher' };
        }),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      };
    }

    const filter = { schoolId, status: 'ACTIVE' };
    if (term) filter.$or = [{ name: term }, { employeeId: term }, { email: term }];
    const [rows, total] = await Promise.all([
      SchoolUser.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
      SchoolUser.countDocuments(filter),
    ]);
    return {
      data: rows.map((row) => ({
        id: String(row._id),
        type: 'STAFF',
        name: row.name,
        ref: row.employeeId,
        subtitle: row.designation || row.role,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  // Authoritative recipient data comes from the database, never from the client.
  async loadRecipient(schoolId, type, id) {
    if (!isId(id)) return null;
    if (type === 'STUDENT') {
      let student;
      try {
        student = await studentService.getStudent(schoolId, id);
      } catch {
        return null;
      }
      return {
        id: String(student.id),
        name: student.name || student.fullName,
        ref: student.admissionNumber,
        gender: student.gender,
        fatherName: student.parentName || '',
        dob: student.dateOfBirth,
        className: student.enrollment?.class?.name || '',
        sectionName: student.enrollment?.section?.name || '',
        session: student.enrollment?.academicYear?.name || '',
        rollNumber: student.enrollment?.rollNumber || '',
        admissionNumber: student.admissionNumber,
      };
    }
    if (type === 'TEACHER') {
      const teacher = await Teacher.findOne({ _id: id, schoolId });
      if (!teacher) return null;
      const json = teacher.toPublicJSON();
      return {
        id: json.id,
        name: json.name,
        ref: json.employeeId,
        gender: json.gender,
        dob: json.dateOfBirth,
        employeeId: json.employeeId,
        department: json.department || '',
        designation: json.designation || 'Teacher',
      };
    }
    const staff = await SchoolUser.findOne({ _id: id, schoolId });
    if (!staff) return null;
    return {
      id: String(staff._id),
      name: staff.name,
      ref: staff.employeeId,
      gender: staff.gender,
      dob: staff.dateOfBirth,
      employeeId: staff.employeeId,
      department: staff.department || '',
      designation: staff.designation || staff.role,
    };
  }

  /* -------------------------------- issuing ------------------------------ */

  async issue(schoolId, payload, actor) {
    if (!isId(payload?.templateId)) throw new AppError('Select a certificate template', 400);
    const template = await CertificateTemplate.findOne({ _id: payload.templateId, schoolId });
    if (!template) throw new AppError('Template not found', 404);
    if (template.status !== 'PUBLISHED') throw new AppError('Publish the template before issuing certificates', 400);
    if (['TIMETABLE', 'FEE_STRUCTURE'].includes(template.type)) {
      throw new AppError('Timetable and fee structure designs are printed for a class, not issued to people', 400);
    }

    const ids = Array.isArray(payload.recipientIds) ? [...new Set(payload.recipientIds.map(String))] : [];
    if (!ids.length) throw new AppError('Select at least one recipient', 400);
    if (ids.length > MAX_ISSUE_BATCH) throw new AppError(`Issue at most ${MAX_ISSUE_BATCH} certificates at a time`, 400);

    const issueDate = parseDate(payload.issueDate, 'Issue date', { required: true });
    const validUntil = parseDate(payload.validUntil, 'Valid until');
    if (validUntil && validUntil < issueDate) throw new AppError('Valid until cannot be before the issue date', 400);
    const courseName = optionalText(payload.courseName, 120);
    const force = payload.force === true || payload.force === 'true';

    const school = await School.findById(schoolId).select('name').lean();
    if (!school) throw new AppError('School not found', 404);

    const type = template.applicableTo;
    const year = issueDate.getFullYear();
    const issued = [];
    const skipped = [];

    for (const recipientId of ids) {
      const person = await this.loadRecipient(schoolId, type, recipientId);
      if (!person) {
        skipped.push({ id: recipientId, reason: 'Recipient not found' });
        continue;
      }
      if (!force) {
        const duplicate = await IssuedCertificate.exists({
          schoolId,
          templateId: template._id,
          recipientId: person.id,
          courseName,
          status: 'ISSUED',
        });
        if (duplicate) {
          skipped.push({ id: person.id, name: person.name, reason: 'Already issued' });
          continue;
        }
      }

      const seq = await nextSequence(schoolId, `certificate-${year}`);
      const certificateNumber = `CERT-${year}-${String(seq).padStart(4, '0')}`;
      const gender = String(person.gender || '').toUpperCase();
      const variables = {
        studentName: person.name,
        recipientName: person.name,
        name: person.name,
        fatherName: person.fatherName || '',
        sonDaughter: gender === 'MALE' ? 'son' : gender === 'FEMALE' ? 'daughter' : 'son/daughter',
        heShe: gender === 'MALE' ? 'he' : gender === 'FEMALE' ? 'she' : 'he/she',
        schoolName: school.name,
        className: person.className || '',
        section: person.sectionName || '',
        classSection: [person.className, person.sectionName].filter(Boolean).join(' - '),
        session: person.session || '',
        issueDate: formatDate(issueDate),
        validUntil: formatDate(validUntil),
        certificateNumber,
        courseName,
        principalName: template.signatoryName || '',
        signatoryName: template.signatoryName || '',
        designation: person.designation || '',
        admissionNumber: person.admissionNumber || '',
        rollNumber: person.rollNumber || '',
        employeeId: person.employeeId || '',
        department: person.department || '',
        dob: formatDate(person.dob),
      };

      const doc = await IssuedCertificate.create({
        schoolId,
        templateId: template._id,
        certificateNumber,
        verifyCode: crypto.randomBytes(12).toString('hex'),
        recipientType: type,
        recipientId: person.id,
        recipientName: person.name,
        recipientRef: person.ref || '',
        courseName,
        issueDate,
        validUntil,
        title: template.title,
        type: template.type,
        renderedText: render(template.text, variables),
        templateName: template.name,
        signatoryName: template.signatoryName,
        designation: template.designation,
        signatureImage: template.signatureImage,
        design: template.design || {},
        variables,
        issuedBy: actor,
      });
      issued.push(doc.toPublicJSON());
    }

    return { issued, skipped };
  }

  async listIssued(schoolId, query = {}) {
    const filter = { schoolId };
    if (query.status === 'ISSUED' || query.status === 'REVOKED') filter.status = query.status;
    if (isId(query.templateId)) filter.templateId = query.templateId;
    if (CERTIFICATE_APPLICABLE.includes(query.recipientType)) filter.recipientType = query.recipientType;
    if (query.search) {
      const term = new RegExp(escapeRegex(String(query.search).trim().slice(0, 80)), 'i');
      filter.$or = [{ recipientName: term }, { certificateNumber: term }, { recipientRef: term }, { courseName: term }];
    }
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const [rows, total] = await Promise.all([
      IssuedCertificate.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      IssuedCertificate.countDocuments(filter),
    ]);
    return {
      data: rows.map((row) => row.toPublicJSON()),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /** Full records (for printing) of specific certificates. */
  async getIssuedMany(schoolId, ids = []) {
    const clean = [...new Set((Array.isArray(ids) ? ids : []).map(String))].filter(isId).slice(0, MAX_ISSUE_BATCH);
    if (!clean.length) return [];
    const rows = await IssuedCertificate.find({ schoolId, _id: { $in: clean } }).sort({ createdAt: 1 });
    return rows.map((row) => row.toPublicJSON());
  }

  async revoke(schoolId, id, reason, actor) {
    if (!isId(id)) throw new AppError('Certificate not found', 404);
    const cert = await IssuedCertificate.findOne({ _id: id, schoolId });
    if (!cert) throw new AppError('Certificate not found', 404);
    if (cert.status === 'REVOKED') throw new AppError('This certificate is already revoked', 409);
    cert.status = 'REVOKED';
    cert.revokedAt = new Date();
    cert.revokeReason = optionalText(reason, 200) || `Revoked by ${actor}`;
    await cert.save();
    return cert.toPublicJSON();
  }

  async reinstate(schoolId, id) {
    if (!isId(id)) throw new AppError('Certificate not found', 404);
    const cert = await IssuedCertificate.findOne({ _id: id, schoolId });
    if (!cert) throw new AppError('Certificate not found', 404);
    cert.status = 'ISSUED';
    cert.revokedAt = null;
    cert.revokeReason = '';
    await cert.save();
    return cert.toPublicJSON();
  }

  /* ------------------------------ verification --------------------------- */

  // Public: only what a verifier needs, nothing about the school's other data.
  async verify(code) {
    const clean = String(code || '').trim();
    if (!/^[a-f0-9]{16,40}$/i.test(clean)) throw new AppError('Certificate not found', 404);
    const cert = await IssuedCertificate.findOne({ verifyCode: clean.toLowerCase() });
    if (!cert) throw new AppError('Certificate not found', 404);
    const school = await School.findById(cert.schoolId).select('name').lean();
    const expired = cert.validUntil && cert.validUntil < new Date();
    return {
      valid: cert.status === 'ISSUED' && !expired,
      status: cert.status === 'REVOKED' ? 'REVOKED' : expired ? 'EXPIRED' : 'VALID',
      certificateNumber: cert.certificateNumber,
      title: cert.title,
      recipientName: cert.recipientName,
      courseName: cert.courseName || '',
      issueDate: cert.issueDate,
      validUntil: cert.validUntil || null,
      schoolName: school?.name || '',
      signatoryName: cert.signatoryName || '',
      designation: cert.designation || '',
    };
  }
}

export const certificateService = new CertificateService();
