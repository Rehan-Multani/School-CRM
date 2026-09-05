import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { sendSchoolWelcomeEmail, sendSchoolResetEmail } from '../config/mailer.js';
import { schoolRepository } from '../repositories/school.repository.js';
import { subscriptionRepository } from '../repositories/subscription.repository.js';
import { billingService } from './billing.service.js';
import { billingRepository } from '../repositories/billing.repository.js';
import { planEndDate, resolveSubscriptionStatus } from '../utils/subscription.utils.js';

const SCHOOL_TYPES = ['Public', 'Private', 'Government', 'Government Aided', 'International', 'Other'];
const SCHOOL_BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'Other'];
const SCHOOL_MEDIA = ['English', 'Hindi', 'English + Hindi', 'Other'];
const SCHOOL_STATUSES = ['Active', 'Inactive', 'Trial', 'Suspended'];
const CLASS_OPTIONS = ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_PRIMARY_COLOR = '#4F46E5';

// Shared brand-theme snapshot for any panel that resolves a School document.
// Keeps the shape identical across school-admin, principal, librarian and HR payloads.
export function schoolThemeSnapshot(school) {
  return {
    theme: school?.settings?.theme || 'light',
    primaryColor: school?.settings?.primaryColor || DEFAULT_PRIMARY_COLOR,
    branding: {
      logo: school?.settings?.portalBranding?.logo || school?.logo || '',
      favicon: school?.settings?.portalBranding?.favicon || '',
    },
  };
}

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    throw new AppError(`${label} is required`, 400);
  }
  return text;
}

function normalizeIndianMobile(value, label, required = true) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) {
    if (required) {
      throw new AppError(`${label} is required`, 400);
    }
    return '';
  }

  let digits = text.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  }

  if (!/^[6-9]\d{9}$/.test(digits)) {
    throw new AppError(`${label} must be a 10-digit Indian mobile number with +91`, 400);
  }

  return `+91${digits}`;
}

function optionalText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalNumber(value, label) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new AppError(`${label} must be a valid number`, 400);
  }

  return parsed;
}

function optionalYear(value) {
  const year = optionalNumber(value, 'Established year');
  if (year === null) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  if (year < 1800 || year > currentYear) {
    throw new AppError(`Established year must be between 1800 and ${currentYear}`, 400);
  }

  return year;
}

function ensureOption(value, options, label) {
  const text = requireText(value, label);
  if (!options.includes(text)) {
    throw new AppError(`${label} is invalid`, 400);
  }
  return text;
}

function normalizeSchoolId(value) {
  const normalized = requireText(value, 'School ID')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!normalized) {
    throw new AppError('School ID is required', 400);
  }

  return normalized;
}

function normalizeCode(value) {
  return requireText(value, 'School code').toUpperCase();
}

function normalizeWebsite(value) {
  const text = optionalText(value);
  if (!text) return '';

  if (!/^https?:\/\//i.test(text)) {
    return `https://${text}`;
  }

  return text;
}

function normalizeLogo(value) {
  const text = optionalText(value);
  if (!text) return '';

  if (text.startsWith('data:image/')) {
    if (text.length > 3_000_000) {
      throw new AppError('Logo image is too large. Please upload an image under 2MB.', 400);
    }
    return text;
  }

  if (/^https?:\/\/.+/i.test(text)) {
    return text;
  }

  throw new AppError('Logo must be a valid image file', 400);
}

function normalizeBrandAsset(value, label) {
  try {
    return normalizeLogo(value);
  } catch (error) {
    if (error instanceof AppError) {
      throw new AppError(`${label} must be a valid image file`, error.statusCode || 400);
    }
    throw error;
  }
}

function normalizeWorkingDays(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.filter((day) => WORKING_DAYS.includes(day)))];
}

function normalizePayload(payload, createdBy) {
  const classFrom = ensureOption(payload?.academic?.classFrom, CLASS_OPTIONS, 'Classes from');
  const classTo = ensureOption(payload?.academic?.classTo, CLASS_OPTIONS, 'Classes to');

  if (CLASS_OPTIONS.indexOf(classFrom) > CLASS_OPTIONS.indexOf(classTo)) {
    throw new AppError('Classes from cannot be after classes to', 400);
  }

  return {
    name: requireText(payload?.name, 'School name'),
    code: normalizeCode(payload?.code),
    schoolId: normalizeSchoolId(payload?.schoolId || payload?.name),
    type: ensureOption(payload?.type, SCHOOL_TYPES, 'School type'),
    board: ensureOption(payload?.board, SCHOOL_BOARDS, 'Board'),
    establishedYear: optionalYear(payload?.establishedYear),
    logo: normalizeLogo(payload?.logo),
    website: normalizeWebsite(payload?.website),
    contact: {
      email: requireText(payload?.contact?.email, 'Official email').toLowerCase(),
      phone: normalizeIndianMobile(payload?.contact?.phone, 'Phone number'),
      alternatePhone: normalizeIndianMobile(payload?.contact?.alternatePhone, 'Alternate phone', false),
      principalName: optionalText(payload?.contact?.principalName),
    },
    address: {
      line1: requireText(payload?.address?.line1, 'Address line 1'),
      line2: optionalText(payload?.address?.line2),
      city: requireText(payload?.address?.city, 'City'),
      state: requireText(payload?.address?.state, 'State'),
      country: requireText(payload?.address?.country, 'Country'),
      pincode: requireText(payload?.address?.pincode, 'Pincode'),
      latitude: optionalNumber(payload?.address?.latitude, 'Latitude'),
      longitude: optionalNumber(payload?.address?.longitude, 'Longitude'),
    },
    academic: {
      session: requireText(payload?.academic?.session, 'Academic session'),
      classFrom,
      classTo,
      medium: ensureOption(payload?.academic?.medium, SCHOOL_MEDIA, 'Medium'),
      workingDays: normalizeWorkingDays(payload?.academic?.workingDays),
    },
    admin: {
      name: requireText(
        payload?.admin?.name || payload?.contact?.principalName || payload?.name,
        'Admin name'
      ),
      email: requireText(payload?.admin?.email || payload?.contact?.email, 'Admin email').toLowerCase(),
      mobile: normalizeIndianMobile(payload?.admin?.mobile || payload?.contact?.phone, 'Admin mobile'),
    },
    subscriptionPlan: optionalText(payload?.subscriptionPlan),
    status: ensureOption(payload?.status, SCHOOL_STATUSES, 'Status'),
    createdBy,
  };
}

function mapMongoError(error) {
  if (error?.code !== 11000) {
    throw error;
  }

  const duplicatedField = Object.keys(error.keyPattern || {})[0];
  if (duplicatedField === 'code') {
    throw new AppError('School code already exists', 409);
  }

  if (duplicatedField === 'schoolId') {
    throw new AppError('School ID already exists', 409);
  }

  throw new AppError('A school with these details already exists', 409);
}

const BCRYPT_ROUNDS = 12;
const RESET_TTL_MS = 30 * 60 * 1000;
const RESET_COOLDOWN_MS = 60 * 1000;
const resetRequestAt = new Map();

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function genericResetResponse(emailSent = false, resetUrl) {
  const payload = {
    message: 'If that email is registered, we sent password reset instructions.',
    emailSent,
  };
  if (env.nodeEnv !== 'production' && resetUrl) {
    payload.resetUrl = resetUrl;
  }
  return payload;
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(10);
  let value = '';
  for (const byte of bytes) {
    value += chars[byte % chars.length];
  }
  return `${value}!`;
}

async function setAdminPassword(school, plainPassword) {
  school.admin.passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
  school.admin.hasLogin = true;
  school.admin.resetPasswordTokenHash = '';
  school.admin.resetPasswordExpiresAt = null;
  school.markModified('admin');
  await school.save();
  return {
    email: school.admin.email,
    password: plainPassword,
    schoolId: school.schoolId,
    schoolName: school.name,
  };
}

function toPortalUser(school) {
  return {
    id: school._id.toString(),
    name: school.admin.name,
    email: school.admin.email,
    phone: school.admin.mobile,
    role: 'School Admin',
    schoolId: school.schoolId,
    schoolName: school.name,
    academicSession: school.academic?.session || '',
    photo: school.logo || '',
    brandingLogo: school.settings?.portalBranding?.logo || '',
    brandingFavicon: school.settings?.portalBranding?.favicon || '',
    theme: school.settings?.theme || 'light',
    primaryColor: school.settings?.primaryColor || '#4F46E5',
    subscriptionPlan: school.subscriptionPlan || '',
    hasPlan: Boolean(school.subscriptionPlan),
  };
}

async function emailCredentials(credentials) {
  try {
    const sent = await sendSchoolWelcomeEmail({
      to: credentials.email,
      schoolName: credentials.schoolName,
      password: credentials.password,
      loginUrl: `${env.frontendUrl}/school-admin/login`,
    });
    return sent;
  } catch (error) {
    console.error('Welcome email failed:', error.message);
    return false;
  }
}

export class SchoolService {
  async listSchools(filters) {
    const { items, total, page, limit } = await schoolRepository.list(filters);
    return {
      data: items.map((school) => school.toPublicJSON()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createSchool(payload, createdBy) {
    try {
      const next = normalizePayload(payload, createdBy);
      next.subscriptionPlan = '';
      const school = await schoolRepository.create(next);
      const requestedPassword = typeof payload?.admin?.password === 'string' ? payload.admin.password.trim() : '';
      if (requestedPassword && requestedPassword.length < 8) {
        throw new AppError('Admin password must be at least 8 characters', 400);
      }
      const credentials = await setAdminPassword(school, requestedPassword || generatePassword());
      const emailSent = await emailCredentials(credentials);
      return { school: school.toPublicJSON(), credentials, emailSent };
    } catch (error) {
      mapMongoError(error);
      throw error;
    }
  }

  async updateSchool(id, payload) {
    try {
      const current = await schoolRepository.findByIdWithPassword(id);
      if (!current) {
        throw new AppError('School not found', 404);
      }

      const next = normalizePayload(payload, undefined);
      delete next.createdBy;
      next.admin.passwordHash = current.admin.passwordHash || '';
      next.admin.hasLogin = Boolean(current.admin.hasLogin || current.admin.passwordHash);
      next.admin.resetPasswordTokenHash = current.admin.resetPasswordTokenHash || '';
      next.admin.resetPasswordExpiresAt = current.admin.resetPasswordExpiresAt || null;
      const school = await schoolRepository.updateById(id, next);

      if (!school) {
        throw new AppError('School not found', 404);
      }

      if (school.subscriptionPlan && school.subscriptionPlan !== current.subscriptionPlan) {
        await billingService.ensureSubscriptionInvoice(school, null);
      }

      return school.toPublicJSON();
    } catch (error) {
      mapMongoError(error);
      throw error;
    }
  }

  async updateStatus(id, status) {
    const nextStatus = ensureOption(status, SCHOOL_STATUSES, 'Status');
    const school = await schoolRepository.updateStatus(id, nextStatus);

    if (!school) {
      throw new AppError('School not found', 404);
    }

    return school.toPublicJSON();
  }

  async deleteSchool(id) {
    const school = await schoolRepository.deleteById(id);

    if (!school) {
      throw new AppError('School not found', 404);
    }

    return school.toPublicJSON();
  }

  async resetLogin(id) {
    const school = await schoolRepository.findByIdWithPassword(id);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    const credentials = await setAdminPassword(school, generatePassword());
    const emailSent = await emailCredentials(credentials);
    return { ...credentials, emailSent };
  }

  async loginSchoolAdmin({ email, password }) {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const school = await schoolRepository.findByAdminEmail(normalizedEmail);
    if (!school?.admin?.passwordHash) {
      throw new AppError('Invalid email or password', 401);
    }

    const matches = await bcrypt.compare(password, school.admin.passwordHash);
    if (!matches) {
      throw new AppError('Invalid email or password', 401);
    }

    if (school.status === 'Suspended') {
      throw new AppError('This school account is suspended', 403);
    }

    const token = signAccessToken(
      { sub: school._id.toString(), role: 'SchoolAdmin', schoolId: school.schoolId },
      { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn }
    );

    return {
      token,
      user: toPortalUser(school),
    };
  }

  async requestPasswordReset({ email }) {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) {
      throw new AppError('Email is required', 400);
    }

    const lastRequest = resetRequestAt.get(normalizedEmail) || 0;
    if (Date.now() - lastRequest < RESET_COOLDOWN_MS) {
      return genericResetResponse(false);
    }
    resetRequestAt.set(normalizedEmail, Date.now());

    const school = await schoolRepository.findByAdminEmail(normalizedEmail);
    if (!school || school.status === 'Suspended') {
      return genericResetResponse(false);
    }

    const token = crypto.randomBytes(32).toString('hex');
    school.admin.resetPasswordTokenHash = hashResetToken(token);
    school.admin.resetPasswordExpiresAt = new Date(Date.now() + RESET_TTL_MS);
    school.markModified('admin');
    await school.save();

    const resetUrl = `${env.frontendUrl}/school-admin/reset-password?token=${token}`;
    let emailSent = false;
    try {
      emailSent = await sendSchoolResetEmail({
        to: school.admin.email,
        schoolName: school.name,
        resetUrl,
      });
    } catch (error) {
      console.error('Reset email failed:', error.message);
    }

    return genericResetResponse(emailSent, resetUrl);
  }

  async resetPasswordWithToken({ token, password }) {
    const rawToken = typeof token === 'string' ? token.trim() : '';
    const nextPassword = typeof password === 'string' ? password.trim() : '';

    if (!rawToken) {
      throw new AppError('Reset token is required', 400);
    }
    if (!nextPassword || nextPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400);
    }

    const school = await schoolRepository.findByResetTokenHash(hashResetToken(rawToken));
    if (!school) {
      throw new AppError('This reset link is invalid or has expired', 400);
    }
    if (school.status === 'Suspended') {
      throw new AppError('This school account is suspended', 403);
    }

    await setAdminPassword(school, nextPassword);
    return { message: 'Password updated. You can sign in with the new password.' };
  }

  async getPortalSchool(schoolId) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    return { user: toPortalUser(school) };
  }

  toSettingsPayload(school) {
    return {
      theme: school.settings?.theme || 'light',
      primaryColor: school.settings?.primaryColor || '#4F46E5',
      portalBranding: {
        logo: school.settings?.portalBranding?.logo || '',
        favicon: school.settings?.portalBranding?.favicon || '',
      },
      smtp: {
        host: school.settings?.smtp?.host || '',
        port: school.settings?.smtp?.port || 587,
        user: school.settings?.smtp?.user || '',
        from: school.settings?.smtp?.from || '',
        passSet: Boolean(school.settings?.smtp?.pass),
      },
      emailTemplate: {
        name: school.settings?.emailTemplate?.name || 'Fee Receipt',
        body: school.settings?.emailTemplate?.body || '',
      },
    };
  }

  async getSettings(schoolId) {
    const school = await schoolRepository.findByIdWithPassword(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    return this.toSettingsPayload(school);
  }

  // Public (no-auth) brand theme lookup used by every role portal + login screens.
  // Accepts a school slug, code, or Mongo _id.
  async getPublicTheme(idOrSlug) {
    const raw = String(idOrSlug || '').trim();
    // `schoolId` is stored lowercase and `code` uppercase; try the value as
    // given, then normalized, so a caller's casing never misses.
    let school = await schoolRepository.findById(raw);
    if (!school && raw && raw.toLowerCase() !== raw) {
      school = await schoolRepository.findById(raw.toLowerCase());
    }
    if (!school && raw && raw.toUpperCase() !== raw) {
      school = await schoolRepository.findById(raw.toUpperCase());
    }
    if (!school) {
      throw new AppError('School not found', 404);
    }
    return {
      schoolId: school.schoolId,
      schoolName: school.name,
      ...schoolThemeSnapshot(school),
    };
  }

  toSchoolConfigPayload(school) {
    return {
      name: school.name,
      code: school.code,
      schoolId: school.schoolId,
      type: school.type,
      board: school.board,
      establishedYear: school.establishedYear,
      logo: school.logo || '',
      website: school.website || '',
      contact: {
        email: school.contact?.email || '',
        phone: school.contact?.phone || '',
        alternatePhone: school.contact?.alternatePhone || '',
        principalName: school.contact?.principalName || '',
      },
      address: {
        line1: school.address?.line1 || '',
        line2: school.address?.line2 || '',
        city: school.address?.city || '',
        state: school.address?.state || '',
        country: school.address?.country || '',
        pincode: school.address?.pincode || '',
      },
      academic: {
        session: school.academic?.session || '',
        classFrom: school.academic?.classFrom || '',
        classTo: school.academic?.classTo || '',
        medium: school.academic?.medium || '',
        workingDays: school.academic?.workingDays || [],
      },
      admin: {
        name: school.admin?.name || '',
        email: school.admin?.email || '',
        mobile: school.admin?.mobile || '',
      },
    };
  }

  normalizePortalConfigPayload(payload) {
    const classFrom = ensureOption(payload?.academic?.classFrom, CLASS_OPTIONS, 'Classes from');
    const classTo = ensureOption(payload?.academic?.classTo, CLASS_OPTIONS, 'Classes to');

    if (CLASS_OPTIONS.indexOf(classFrom) > CLASS_OPTIONS.indexOf(classTo)) {
      throw new AppError('Classes from cannot be after classes to', 400);
    }

    return {
      name: requireText(payload?.name, 'School name'),
      type: ensureOption(payload?.type, SCHOOL_TYPES, 'School type'),
      board: ensureOption(payload?.board, SCHOOL_BOARDS, 'Board'),
      establishedYear: optionalYear(payload?.establishedYear),
      logo: normalizeLogo(payload?.logo),
      website: normalizeWebsite(payload?.website),
      contact: {
        email: requireText(payload?.contact?.email, 'Official email').toLowerCase(),
        phone: normalizeIndianMobile(payload?.contact?.phone, 'Phone number'),
        alternatePhone: normalizeIndianMobile(payload?.contact?.alternatePhone, 'Alternate phone', false),
        principalName: optionalText(payload?.contact?.principalName),
      },
      address: {
        line1: requireText(payload?.address?.line1, 'Address line 1'),
        line2: optionalText(payload?.address?.line2),
        city: requireText(payload?.address?.city, 'City'),
        state: requireText(payload?.address?.state, 'State'),
        country: requireText(payload?.address?.country, 'Country'),
        pincode: requireText(payload?.address?.pincode, 'Pincode'),
      },
      academic: {
        session: requireText(payload?.academic?.session, 'Academic session'),
        classFrom,
        classTo,
        medium: ensureOption(payload?.academic?.medium, SCHOOL_MEDIA, 'Medium'),
        workingDays: normalizeWorkingDays(payload?.academic?.workingDays),
      },
      admin: {
        name: requireText(payload?.admin?.name || payload?.contact?.principalName || payload?.name, 'Admin name'),
        mobile: normalizeIndianMobile(payload?.admin?.mobile || payload?.contact?.phone, 'Admin mobile'),
      },
    };
  }

  async getSchoolConfig(schoolId) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    return this.toSchoolConfigPayload(school);
  }

  async updateSchoolConfig(schoolId, payload = {}) {
    const current = await schoolRepository.findByIdWithPassword(schoolId);
    if (!current) {
      throw new AppError('School not found', 404);
    }

    const next = this.normalizePortalConfigPayload(payload);
    const update = {
      name: next.name,
      type: next.type,
      board: next.board,
      establishedYear: next.establishedYear,
      logo: next.logo,
      website: next.website,
      contact: next.contact,
      address: {
        ...next.address,
        latitude: current.address?.latitude ?? null,
        longitude: current.address?.longitude ?? null,
      },
      academic: next.academic,
      admin: {
        name: next.admin.name,
        email: current.admin.email,
        mobile: next.admin.mobile,
        passwordHash: current.admin.passwordHash || '',
        hasLogin: Boolean(current.admin.hasLogin || current.admin.passwordHash),
        resetPasswordTokenHash: current.admin.resetPasswordTokenHash || '',
        resetPasswordExpiresAt: current.admin.resetPasswordExpiresAt || null,
      },
    };

    const school = await schoolRepository.updateById(schoolId, update);
    if (!school) {
      throw new AppError('School not found', 404);
    }

    return {
      data: this.toSchoolConfigPayload(school),
      user: toPortalUser(school),
    };
  }

  async updateTheme(schoolId, payload = {}) {
    const themeValue = typeof payload === 'string' ? payload : payload.theme;
    const colorValue = typeof payload === 'string' ? undefined : payload.primaryColor;
    const $set = {};

    if (themeValue !== undefined) {
      $set['settings.theme'] = themeValue === 'dark' ? 'dark' : 'light';
    }

    if (colorValue !== undefined) {
      let hex = String(colorValue).trim();
      if (!hex.startsWith('#')) hex = `#${hex}`;
      if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
        hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
      }
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        throw new AppError('Accent color must be a valid hex value like #4F46E5', 400);
      }
      $set['settings.primaryColor'] = hex.toUpperCase();
    }

    if (!Object.keys($set).length) {
      throw new AppError('Theme or accent color is required', 400);
    }

    const school = await schoolRepository.updateById(schoolId, { $set });
    if (!school) {
      throw new AppError('School not found', 404);
    }

    return {
      theme: school.settings?.theme || 'light',
      primaryColor: school.settings?.primaryColor || '#4F46E5',
      user: toPortalUser(school),
    };
  }

  async updatePortalBranding(schoolId, payload = {}) {
    const $set = {};

    if (payload.logo !== undefined) {
      $set['settings.portalBranding.logo'] = normalizeBrandAsset(payload.logo, 'Logo');
    }
    if (payload.favicon !== undefined) {
      $set['settings.portalBranding.favicon'] = normalizeBrandAsset(payload.favicon, 'Favicon');
    }

    if (!Object.keys($set).length) {
      throw new AppError('Logo or favicon is required', 400);
    }

    const school = await schoolRepository.updateById(schoolId, { $set });
    if (!school) {
      throw new AppError('School not found', 404);
    }

    return {
      portalBranding: {
        logo: school.settings?.portalBranding?.logo || '',
        favicon: school.settings?.portalBranding?.favicon || '',
      },
      user: toPortalUser(school),
    };
  }

  async changePortalPassword(schoolId, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }
    if (String(newPassword).length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    const school = await schoolRepository.findByIdWithPassword(schoolId);
    if (!school?.admin?.passwordHash) {
      throw new AppError('School not found', 404);
    }

    const matches = await bcrypt.compare(currentPassword, school.admin.passwordHash);
    if (!matches) {
      throw new AppError('Current password is incorrect', 401);
    }

    school.admin.passwordHash = await bcrypt.hash(newPassword, 10);
    school.admin.resetPasswordTokenHash = null;
    school.admin.resetPasswordExpiresAt = null;
    await school.save();
    return { message: 'Password updated successfully' };
  }

  async updateEmailSettings(schoolId, payload = {}) {
    const existing = await schoolRepository.findByIdWithPassword(schoolId);
    if (!existing) {
      throw new AppError('School not found', 404);
    }

    const $set = {};
    if (payload.host !== undefined) $set['settings.smtp.host'] = String(payload.host).trim();
    if (payload.port !== undefined) {
      const port = Number(payload.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new AppError('SMTP port must be a number between 1 and 65535', 400);
      }
      $set['settings.smtp.port'] = port;
    }
    if (payload.user !== undefined) $set['settings.smtp.user'] = String(payload.user).trim().toLowerCase();
    if (payload.from !== undefined) $set['settings.smtp.from'] = String(payload.from).trim();
    if (payload.pass !== undefined && String(payload.pass).trim()) {
      $set['settings.smtp.pass'] = String(payload.pass);
    }
    if (payload.templateName !== undefined) {
      $set['settings.emailTemplate.name'] = String(payload.templateName).trim() || 'Fee Receipt';
    }
    if (payload.templateBody !== undefined) {
      $set['settings.emailTemplate.body'] = String(payload.templateBody);
    }

    if (Object.keys($set).length) {
      await schoolRepository.updateById(schoolId, { $set });
    }

    const school = await schoolRepository.findByIdWithPassword(schoolId);
    return this.toSettingsPayload(school);
  }

  async getPortalSubscription(schoolId) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    if (!school.subscriptionPlan) {
      return { subscription: null };
    }

    const plan = await subscriptionRepository.findByName(school.subscriptionPlan);
    const invoice = await billingRepository.findLatestForSchool(schoolId, school.subscriptionPlan);

    const planType =
      school.subscription?.planType || plan?.planType || invoice?.planType || 'Monthly';
    const startedAtRaw =
      school.subscription?.startedAt ||
      invoice?.paidAt ||
      invoice?.issuedAt ||
      school.updatedAt ||
      new Date();
    const startedAt = startedAtRaw instanceof Date ? startedAtRaw : new Date(startedAtRaw);
    const endsAtRaw =
      school.subscription?.endsAt || planEndDate(startedAt, planType);
    const endsAt = endsAtRaw instanceof Date ? endsAtRaw : new Date(endsAtRaw);
    const billingStatus = invoice?.status || 'Pending';
    const status = resolveSubscriptionStatus(endsAt, billingStatus);

    const msRemaining = endsAt && !isNaN(endsAt.getTime()) ? endsAt.getTime() - Date.now() : 0;
    const daysRemaining = Math.max(0, Math.ceil(msRemaining / 86400000));

    return {
      subscription: {
        planId: plan?._id?.toString() || school.subscription?.planId?.toString() || '',
        planName: school.subscriptionPlan,
        planType,
        price: plan?.price ?? invoice?.amount ?? 0,
        features: plan?.features || [],
        startedAt: startedAt && !isNaN(startedAt.getTime()) ? startedAt.toISOString() : null,
        endsAt: endsAt && !isNaN(endsAt.getTime()) ? endsAt.toISOString() : null,
        daysRemaining,
        status,
        billing: invoice
          ? {
              invoiceId: invoice._id.toString(),
              invoiceNumber: invoice.invoiceNumber,
              amount: invoice.amount,
              status: invoice.status,
              issuedAt: invoice.issuedAt ? new Date(invoice.issuedAt).toISOString() : null,
              dueAt: invoice.dueAt ? new Date(invoice.dueAt).toISOString() : null,
              paidAt: invoice.paidAt ? new Date(invoice.paidAt).toISOString() : null,
              paymentMethod: invoice.paymentMethod || '',
            }
          : null,
      },
    };
  }

  /**
   * Step 1 of plan selection: creates (or reuses) a Pending invoice for this
   * school+plan and a matching Razorpay order. The plan is NOT granted here —
   * `confirmPlanSelection` only activates it after the payment signature
   * verifies, so a school can never get portal access without actually paying.
   */
  async initiatePlanSelection(schoolId, planId) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    if (school.subscriptionPlan) {
      throw new AppError('A subscription plan is already selected for this school', 400);
    }

    const plan = await subscriptionRepository.findById(planId);
    if (!plan) {
      throw new AppError('Subscription plan not found', 404);
    }

    let invoice = await billingRepository.findOpenForSchoolPlan(school._id, plan.name);
    if (!invoice) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 14);
      invoice = await billingRepository.create({
        invoiceNumber: await billingRepository.nextInvoiceNumber(),
        school: school._id,
        schoolName: school.name,
        schoolCode: school.code,
        planName: plan.name,
        planType: plan.planType,
        amount: plan.price,
        currency: 'INR',
        status: 'Pending',
        issuedAt: new Date(),
        dueAt,
      });
    }

    const order = await billingService.createRazorpayOrder(invoice._id.toString());
    return { ...order, planId: plan._id.toString() };
  }

  /**
   * Step 2: verifies the Razorpay payment signature for the invoice created
   * above, marks it Paid, and only then grants the plan (status Active — no
   * more "Pending Payment" free-access window).
   */
  async confirmPlanSelection(schoolId, planId, paymentPayload) {
    const school = await schoolRepository.findById(schoolId);
    if (!school) {
      throw new AppError('School not found', 404);
    }
    if (school.subscriptionPlan) {
      throw new AppError('A subscription plan is already selected for this school', 400);
    }

    const plan = await subscriptionRepository.findById(planId);
    if (!plan) {
      throw new AppError('Subscription plan not found', 404);
    }

    const invoiceId = paymentPayload?.invoiceId;
    if (!invoiceId) {
      throw new AppError('Invoice reference is required', 400);
    }
    const invoice = await billingRepository.findById(invoiceId);
    if (!invoice || invoice.school?.toString() !== schoolId.toString() || invoice.planName !== plan.name) {
      throw new AppError('Invoice not found for this school and plan', 404);
    }

    const paidInvoice =
      invoice.status === 'Paid'
        ? invoice.toPublicJSON()
        : await billingService.verifyRazorpayPayment(invoice._id.toString(), paymentPayload);

    const startedAt = new Date();
    school.subscriptionPlan = plan.name;
    school.subscription = {
      planId: plan._id,
      planType: plan.planType,
      startedAt,
      endsAt: planEndDate(startedAt, plan.planType),
      status: 'Active',
    };
    await school.save();

    return {
      user: toPortalUser(school),
      invoice: paidInvoice,
    };
  }
}

export const schoolService = new SchoolService();
