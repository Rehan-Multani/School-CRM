import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { Teacher } from '../models/Teacher.js';
import { Student } from '../models/Student.js';
import { Parent } from '../models/Parent.js';
import { Driver } from '../models/Driver.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { PasswordResetOtp, PASSWORD_RESET_ROLES } from '../models/PasswordResetOtp.js';
import { smsService } from './sms.service.js';
import { toMobileDigits, isValidMobile, mobileVariants } from '../utils/mobile.js';
import { env } from '../config/env.js';

/**
 * Forgot-password for the mobile-app roles, by OTP to the registered mobile.
 *
 *   1. POST forgot-password     { role, identifier }        → OTP by SMS
 *   2. POST verify-reset-otp    { role, identifier, otp }   → { resetToken }
 *   3. POST reset-password      { resetToken, newPassword } → password set
 *
 * The identifier is resolved EXACTLY like each role's login, so "the account
 * I sign in with" and "the account I reset" can never differ. Step 1 always
 * returns the same generic answer — whether the account exists, is inactive,
 * has no mobile, or is in resend cooldown — so it cannot be used to probe
 * which logins are registered.
 */

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60;
const RESET_TOKEN_TTL_SECONDS = 10 * 60;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_RESENDS = 3;
const MIN_PASSWORD_LEN = 8;
const BCRYPT_ROUNDS = 10; // matches every role's login provisioning

const ERR = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  OTP_INVALID: 'OTP_INVALID',
  OTP_LOCKED: 'OTP_LOCKED',
  RESET_TOKEN_INVALID: 'RESET_TOKEN_INVALID',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
};

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

function isActive(doc) {
  if (doc.status && doc.status !== 'ACTIVE') return false;
  const acct = doc.account?.accountStatus || '';
  return !acct || acct === 'ACTIVE';
}

/** Same query + ambiguity rule as the role's login; >1 match → no account. */
async function findOne(Model, primary, fallback) {
  let candidates = await Model.find(primary).select('+passwordHash').limit(3);
  if (!candidates.length && fallback) candidates = await Model.find(fallback).select('+passwordHash').limit(3);
  return candidates.length === 1 ? candidates[0] : null;
}

/** Student / parent are found by the mobile they sign in with, however it was typed or stored. */
const byMobile = (id) => (isValidMobile(id) ? [{ phone: { $in: mobileVariants(id) } }] : []);

const RESOLVERS = {
  TEACHER: {
    Model: Teacher,
    async find(id) {
      const rx = new RegExp(`^${escapeRegex(id)}$`, 'i');
      return findOne(
        Teacher,
        { $or: [{ 'account.loginEmail': id }, { email: id }] },
        { $or: [{ 'account.username': rx }, { employeeId: rx }] }
      );
    },
    phone: (t) => t.mobileNumber || t.phone,
    canLogin: (t) => isActive(t),
  },
  STUDENT: {
    Model: Student,
    async find(id) {
      const rx = new RegExp(`^${escapeRegex(id)}$`, 'i');
      return findOne(
        Student,
        { $or: [{ 'account.loginEmail': id }, { email: id }] },
        { $or: [{ 'account.username': rx }, { admissionNumber: rx }, ...byMobile(id)] }
      );
    },
    // Most students have no phone of their own — the OTP then goes to the guardian.
    phone: (s) => (isValidMobile(s.phone) ? s.phone : s.parentPhone),
    canLogin: (s) => isActive(s),
    // Signs in by mobile OTP, so there may be no password yet — the reset sets the first one.
    passwordOptional: true,
  },
  PARENT: {
    Model: Parent,
    async find(id) {
      const rx = new RegExp(`^${escapeRegex(id)}$`, 'i');
      return findOne(
        Parent,
        { $or: [{ 'account.loginEmail': id }, { email: id }] },
        { $or: [{ phone: rx }, { 'account.username': rx }, ...byMobile(id)] }
      );
    },
    phone: (p) => p.phone,
    canLogin: (p) => isActive(p),
    passwordOptional: true,
  },
  // The Transport Manager app: a staff account (SchoolUser, role TRANSPORT).
  TRANSPORT: {
    Model: SchoolUser,
    async find(id) {
      const rx = new RegExp(`^${escapeRegex(id)}$`, 'i');
      return findOne(SchoolUser, { role: 'TRANSPORT', email: id }, { role: 'TRANSPORT', employeeId: rx });
    },
    phone: (u) => u.phone,
    canLogin: (u) => u.status === 'ACTIVE',
  },
  // The Principal app: a staff account (SchoolUser, role PRINCIPAL).
  PRINCIPAL: {
    Model: SchoolUser,
    async find(id) {
      const rx = new RegExp(`^${escapeRegex(id)}$`, 'i');
      return findOne(SchoolUser, { role: 'PRINCIPAL', email: id }, { role: 'PRINCIPAL', employeeId: rx });
    },
    phone: (u) => u.phone,
    canLogin: (u) => u.status === 'ACTIVE',
  },
  DRIVER: {
    Model: Driver,
    async find(id) {
      const mobile = id.replace(/[\s-]/g, '').replace(/^\+91/, '');
      return findOne(Driver, { mobile });
    },
    phone: (d) => d.mobile,
    canLogin: (d) => d.status === 'ACTIVE' && Boolean(d.loginEnabled),
  },
};

function parseRole(role) {
  const key = String(role || '').trim().toUpperCase();
  if (!PASSWORD_RESET_ROLES.includes(key)) {
    throw new AppError('A valid role is required', 400, ERR.VALIDATION_ERROR);
  }
  return key;
}

function parseIdentifier(identifier) {
  const id = String(identifier || '').trim().toLowerCase();
  if (!id) throw new AppError('Login ID is required', 400, ERR.VALIDATION_ERROR);
  return id;
}

/** The account a reset may target: exists, unambiguous, active, has a login and a mobile. */
async function resolveAccount(role, identifier) {
  const resolver = RESOLVERS[role];
  const account = await resolver.find(identifier);
  if (!account || !resolver.canLogin(account)) return null;
  if (!account.passwordHash && !resolver.passwordOptional) return null;
  const phone = toMobileDigits(resolver.phone(account));
  if (!isValidMobile(phone)) return null;
  return { account, phone };
}

function generateOtp() {
  const isStatic =
    env.loginOtp?.otpMode === 'static' ||
    (env.nodeEnv !== 'production' && env.loginOtp?.otpMode !== 'random');
  if (isStatic) {
    return String(env.loginOtp?.staticOtp || '123456').padStart(OTP_LENGTH, '0').slice(0, OTP_LENGTH);
  }
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

const genericSent = (extra = {}) => ({
  message: 'If an account matches, an OTP has been sent to its registered mobile number.',
  otpLength: OTP_LENGTH,
  expiresIn: OTP_TTL_SECONDS,
  resendIn: RESEND_COOLDOWN_SECONDS,
  ...extra,
});

class PasswordResetService {
  async requestOtp(body = {}) {
    const role = parseRole(body.role);
    const identifier = parseIdentifier(body.identifier);

    const match = await resolveAccount(role, identifier);
    if (!match) return genericSent();
    const { account, phone } = match;

    const now = new Date();
    let session = await PasswordResetOtp.findOne({
      role,
      accountId: account._id,
      status: 'OTP_SENT',
      otpExpiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    if (session) {
      const elapsed = (now - new Date(session.lastOtpSentAt || session.createdAt)) / 1000;
      // Silent no-op: the answer must look identical to a fresh send.
      if (elapsed < RESEND_COOLDOWN_SECONDS || session.resendCount >= MAX_RESENDS) return genericSent();
      session.resendCount += 1;
    } else {
      session = new PasswordResetOtp({ role, accountId: account._id, schoolId: account.schoolId || null });
    }

    const otp = generateOtp();
    session.otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
    session.otpExpiresAt = new Date(now.getTime() + OTP_TTL_SECONDS * 1000);
    session.otpAttempts = 0;
    session.lastOtpSentAt = now;
    await session.save();

    try {
      await smsService.sendSms({
        phone,
        message: `${otp} is your School CRM password reset OTP. It expires in ${OTP_TTL_SECONDS / 60} minutes. Do not share it with anyone.`,
        template: 'PASSWORD_RESET_OTP',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[password-reset] OTP SMS failed:', error.code || error.message);
    }

    const isDev = env.nodeEnv !== 'production' || env.loginOtp?.otpMode === 'static';
    return genericSent(isDev ? { otp } : {});
  }

  async verifyOtp(body = {}) {
    const role = parseRole(body.role);
    const identifier = parseIdentifier(body.identifier);
    const otp = String(body.otp || '').trim();
    if (!/^\d+$/.test(otp)) throw new AppError('Enter the OTP sent to your mobile', 400, ERR.VALIDATION_ERROR);

    const invalid = new AppError('The OTP is invalid or has expired', 400, ERR.OTP_INVALID);
    const match = await resolveAccount(role, identifier);
    if (!match) throw invalid;

    const session = await PasswordResetOtp.findOne({
      role,
      accountId: match.account._id,
      status: 'OTP_SENT',
      otpExpiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select('+otpHash');
    if (!session) throw invalid;

    if (session.otpAttempts >= MAX_OTP_ATTEMPTS) {
      throw new AppError('Too many wrong attempts. Please request a new OTP.', 429, ERR.OTP_LOCKED);
    }

    const isStaticAllowed = env.loginOtp?.otpMode === 'static' || env.nodeEnv !== 'production';
    const isStaticMatch = isStaticAllowed && (otp === '123456' || otp === String(env.loginOtp?.staticOtp || '123456'));
    const ok = isStaticMatch || (await bcrypt.compare(otp, session.otpHash || '').catch(() => false));
    if (!ok) {
      session.otpAttempts += 1;
      // A locked session is burnt so the next "Resend" starts a fresh one.
      if (session.otpAttempts >= MAX_OTP_ATTEMPTS) session.otpExpiresAt = new Date();
      await session.save();
      const left = Math.max(0, MAX_OTP_ATTEMPTS - session.otpAttempts);
      throw new AppError(
        left ? `Incorrect OTP. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Please request a new OTP.',
        left ? 400 : 429,
        left ? ERR.OTP_INVALID : ERR.OTP_LOCKED
      );
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    session.status = 'VERIFIED';
    session.otpHash = '';
    session.resetTokenHash = sha256(resetToken);
    session.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000);
    await session.save();

    return { resetToken, expiresIn: RESET_TOKEN_TTL_SECONDS };
  }

  async resetPassword(body = {}) {
    const resetToken = String(body.resetToken || '').trim();
    const newPassword = String(body.newPassword || body.password || '');
    if (!resetToken) throw new AppError('Reset token is required', 400, ERR.VALIDATION_ERROR);
    if (newPassword.trim().length < MIN_PASSWORD_LEN) {
      throw new AppError(`Password must be at least ${MIN_PASSWORD_LEN} characters`, 400, ERR.PASSWORD_TOO_SHORT);
    }

    const expired = new AppError('Your reset session has expired. Please start again.', 400, ERR.RESET_TOKEN_INVALID);
    const session = await PasswordResetOtp.findOne({
      resetTokenHash: sha256(resetToken),
      status: 'VERIFIED',
      resetTokenExpiresAt: { $gt: new Date() },
    });
    if (!session) throw expired;

    const { Model, canLogin } = RESOLVERS[session.role];
    const account = await Model.findById(session.accountId).select('+passwordHash');
    if (!account || !canLogin(account)) throw expired;

    account.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    if (account.schema.path('mustResetPassword')) account.mustResetPassword = false;
    await account.save();

    // Single use; also retire any other open request for the same account.
    session.status = 'USED';
    session.resetTokenHash = '';
    await session.save();
    await PasswordResetOtp.updateMany(
      { role: session.role, accountId: session.accountId, status: { $ne: 'USED' } },
      { $set: { status: 'USED', otpHash: '', resetTokenHash: '' } }
    );

    return { message: 'Password updated. You can now sign in with your new password.' };
  }
}

export const passwordResetService = new PasswordResetService();
export { OTP_LENGTH, MAX_OTP_ATTEMPTS };
