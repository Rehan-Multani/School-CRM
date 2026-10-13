import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination, escapeRegex } from '../../../shared/sanitize.js';
import { StudentEnquiry, ENQUIRY_STATUSES } from '../models/StudentEnquiry.js';
import { EnquiryFormConfig } from '../models/EnquiryFormConfig.js';
import { schoolService } from './school.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const str = (v) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
const MAX_FIELDS = 25;
const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'select', 'email', 'phone'];
const PHONE_RE = /^[+\d][\d\s-]{6,18}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Stored on the enquiry's own columns; every other field goes to `extra`.
const CORE_KEYS = ['studentName', 'parentName', 'mobile', 'email', 'classApplying'];
// The student's name and a phone number are what make an enquiry followable — always on.
const LOCKED_KEYS = ['studentName', 'mobile'];

const DEFAULT_FIELDS = [
  { key: 'studentName', label: "Student's name", type: 'text', required: true, enabled: true, builtIn: true },
  { key: 'parentName', label: "Parent / guardian name", type: 'text', required: true, enabled: true, builtIn: true },
  { key: 'mobile', label: 'Mobile number', type: 'phone', required: true, enabled: true, builtIn: true },
  { key: 'email', label: 'Email', type: 'email', required: false, enabled: true, builtIn: true },
  { key: 'classApplying', label: 'Class applying for', type: 'text', required: false, enabled: true, builtIn: true },
  { key: 'message', label: 'Message / questions', type: 'textarea', required: false, enabled: true, builtIn: true },
];
const BUILT_IN_KEYS = DEFAULT_FIELDS.map((f) => f.key);

const defaultConfig = (schoolId) => ({
  schoolId: String(schoolId),
  enabled: true,
  title: 'Student Enquiry',
  intro: '',
  successMessage: '',
  fields: DEFAULT_FIELDS.map((f) => ({ ...f, options: [] })),
});

const publicField = (f) => ({
  key: f.key,
  label: f.label,
  type: f.type,
  required: !!f.required,
  enabled: f.enabled !== false,
  options: f.options || [],
  builtIn: !!f.builtIn,
});

const publicConfig = (doc, schoolId) => {
  const base = doc ? doc.toObject?.() || doc : defaultConfig(schoolId);
  // Built-ins missing from an older saved config are put back, so the form never loses a core field.
  const have = new Set((base.fields || []).map((f) => f.key));
  const missing = DEFAULT_FIELDS.filter((f) => !have.has(f.key)).map((f) => ({ ...f, options: [] }));
  return {
    enabled: base.enabled !== false,
    title: base.title || 'Student Enquiry',
    intro: base.intro || '',
    successMessage: base.successMessage || '',
    fields: [...(base.fields || []), ...missing].map(publicField),
  };
};

const slug = (s) =>
  str(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

function cleanFields(input) {
  if (!Array.isArray(input)) throw new AppError('fields must be a list', 400, 'VALIDATION_ERROR');
  if (input.length > MAX_FIELDS) throw new AppError(`A form can have at most ${MAX_FIELDS} fields`, 400, 'VALIDATION_ERROR');
  const used = new Set();
  const out = [];
  for (const raw of input) {
    const builtIn = BUILT_IN_KEYS.includes(raw?.key);
    const label = str(raw?.label).slice(0, 120);
    if (!label) throw new AppError('Every field needs a label', 400, 'VALIDATION_ERROR');
    let key = builtIn ? raw.key : str(raw?.key) || `c_${slug(label)}`;
    if (!builtIn) {
      key = key.startsWith('c_') ? key : `c_${slug(key) || slug(label)}`;
      if (key === 'c_') key = `c_field_${out.length + 1}`;
      let n = 2;
      const base = key;
      while (used.has(key)) key = `${base}_${n++}`;
    }
    if (used.has(key)) continue;
    used.add(key);
    const type = builtIn
      ? DEFAULT_FIELDS.find((f) => f.key === key).type
      : FIELD_TYPES.includes(raw?.type)
        ? raw.type
        : 'text';
    const options =
      type === 'select'
        ? [...new Set((Array.isArray(raw?.options) ? raw.options : []).map((o) => str(o).slice(0, 80)).filter(Boolean))].slice(0, 30)
        : [];
    if (type === 'select' && options.length < 2) {
      throw new AppError(`"${label}" needs at least two options`, 400, 'VALIDATION_ERROR');
    }
    const locked = LOCKED_KEYS.includes(key);
    out.push({
      key,
      label,
      type,
      builtIn,
      options,
      enabled: locked ? true : raw?.enabled !== false,
      required: locked ? true : !!raw?.required,
    });
  }
  for (const k of LOCKED_KEYS) {
    if (!used.has(k)) out.unshift({ ...DEFAULT_FIELDS.find((f) => f.key === k), options: [] });
  }
  return out;
}

function validateAnswer(field, rawValue) {
  const v = str(rawValue);
  if (!v) {
    if (field.required) throw new AppError(`${field.label} is required`, 400, 'VALIDATION_ERROR');
    return '';
  }
  const max = field.type === 'textarea' ? 1000 : 200;
  if (v.length > max) throw new AppError(`${field.label} is too long`, 400, 'VALIDATION_ERROR');
  if (field.type === 'phone' && !PHONE_RE.test(v)) throw new AppError('Enter a valid mobile number', 400, 'VALIDATION_ERROR');
  if (field.type === 'email' && !EMAIL_RE.test(v)) throw new AppError('Enter a valid email address', 400, 'VALIDATION_ERROR');
  if (field.type === 'number' && Number.isNaN(Number(v))) throw new AppError(`${field.label} must be a number`, 400, 'VALIDATION_ERROR');
  if (field.type === 'date' && Number.isNaN(new Date(v).getTime())) throw new AppError(`${field.label} must be a valid date`, 400, 'VALIDATION_ERROR');
  if (field.type === 'select' && !(field.options || []).includes(v)) throw new AppError(`Choose a valid option for ${field.label}`, 400, 'VALIDATION_ERROR');
  return v;
}

class StudentEnquiryService {
  async getConfig(schoolId) {
    const doc = await EnquiryFormConfig.findOne({ schoolId: oid(schoolId) });
    return publicConfig(doc, schoolId);
  }

  async saveConfig(schoolId, body = {}) {
    const patch = {};
    if (body.enabled !== undefined) patch.enabled = !!body.enabled;
    for (const [key, max] of [['title', 120], ['intro', 500], ['successMessage', 300]]) {
      if (body[key] !== undefined) {
        const v = str(body[key]);
        if (v.length > max) throw new AppError(`${key} is too long`, 400, 'VALIDATION_ERROR');
        patch[key] = v;
      }
    }
    if (patch.title === '') patch.title = 'Student Enquiry';
    if (body.fields !== undefined) patch.fields = cleanFields(body.fields);
    const doc = await EnquiryFormConfig.findOneAndUpdate(
      { schoolId: oid(schoolId) },
      { $set: patch, $setOnInsert: { schoolId: oid(schoolId) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return publicConfig(doc, schoolId);
  }

  // What the share link needs: the school's public slug (the link is built from it).
  async shareInfo(schoolId) {
    const { School } = await import('../models/School.js');
    const school = await School.findById(oid(schoolId)).select('schoolId name').lean();
    if (!school) throw new AppError('School not found', 404, 'NOT_FOUND');
    return { schoolSlug: school.schoolId, schoolName: school.name, path: `/enquiry/${school.schoolId}` };
  }

  // ---- Public form (no login) ----
  async publicForm(idOrSlug) {
    const school = await schoolService.findPublicSchool(idOrSlug, '_id schoolId name');
    const cfg = await this.getConfig(school._id);
    return {
      schoolId: school.schoolId,
      schoolName: school.name,
      enabled: cfg.enabled,
      title: cfg.title,
      intro: cfg.intro,
      fields: cfg.enabled ? cfg.fields.filter((f) => f.enabled).map(({ enabled, builtIn, ...f }) => f) : [],
    };
  }

  async submit(idOrSlug, answers = {}) {
    const school = await schoolService.findPublicSchool(idOrSlug, '_id schoolId name');
    const cfg = await this.getConfig(school._id);
    if (!cfg.enabled) throw new AppError('This school is not taking enquiries through this form right now', 403, 'FORM_CLOSED');
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new AppError('Invalid form data', 400, 'VALIDATION_ERROR');
    }
    const doc = { schoolId: school._id, extra: [], source: 'FORM' };
    for (const field of cfg.fields.filter((f) => f.enabled)) {
      const v = validateAnswer(field, answers[field.key]);
      if (CORE_KEYS.includes(field.key)) doc[field.key] = v;
      else if (v) doc.extra.push({ key: field.key, label: field.label, value: v });
    }
    const row = await StudentEnquiry.create(doc);
    return { id: row.id, message: cfg.successMessage || 'Thank you! Your enquiry has been received. The school will contact you soon.' };
  }

  // ---- Staff side ----
  async list(schoolId, query = {}) {
    const filter = { schoolId: oid(schoolId) };
    const status = str(query.status).toUpperCase();
    if (ENQUIRY_STATUSES.includes(status)) filter.status = status;
    const q = str(query.search || query.q);
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ studentName: rx }, { parentName: rx }, { mobile: rx }, { email: rx }, { classApplying: rx }];
    }
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 100 });
    const [rows, total, grouped] = await Promise.all([
      StudentEnquiry.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
      StudentEnquiry.countDocuments(filter),
      StudentEnquiry.aggregate([{ $match: { schoolId: oid(schoolId) } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const stats = { TOTAL: 0 };
    ENQUIRY_STATUSES.forEach((s) => {
      stats[s] = 0;
    });
    grouped.forEach((g) => {
      stats[g._id] = g.n;
      stats.TOTAL += g.n;
    });
    return {
      data: rows.map((r) => r.toPublicJSON()),
      stats,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async update(schoolId, id, body = {}) {
    const set = {};
    if (body.status !== undefined) {
      const status = str(body.status).toUpperCase();
      if (!ENQUIRY_STATUSES.includes(status)) throw new AppError('Invalid status', 400, 'VALIDATION_ERROR');
      set.status = status;
    }
    if (body.note !== undefined) {
      const note = str(body.note);
      if (note.length > 500) throw new AppError('Note is too long', 400, 'VALIDATION_ERROR');
      set.note = note;
    }
    if (!Object.keys(set).length) throw new AppError('Nothing to update', 400, 'VALIDATION_ERROR');
    const row = await StudentEnquiry.findOneAndUpdate({ _id: oid(id), schoolId: oid(schoolId) }, { $set: set }, { new: true });
    if (!row) throw new AppError('Enquiry not found', 404, 'NOT_FOUND');
    return row.toPublicJSON();
  }

  async remove(schoolId, id) {
    const row = await StudentEnquiry.findOneAndDelete({ _id: oid(id), schoolId: oid(schoolId) });
    if (!row) throw new AppError('Enquiry not found', 404, 'NOT_FOUND');
    return { id: String(id) };
  }
}

export const studentEnquiryService = new StudentEnquiryService();

