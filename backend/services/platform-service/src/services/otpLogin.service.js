import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { Student } from '../models/Student.js';
import { Parent } from '../models/Parent.js';
import { ParentStudent } from '../models/ParentStudent.js';
import { School } from '../models/School.js';
import { LoginOtp, OTP_LOGIN_ROLES } from '../models/LoginOtp.js';
import { smsService } from './sms.service.js';
import { studentAuthService } from './studentAuth.service.js';
import { parentAuthService } from './parentAuth.service.js';
import { toMobileDigits, isValidMobile, mobileVariants } from '../utils/mobile.js';
import { checkRoleMismatch } from './roleMismatch.service.js';

/**
 * Sign-in by mobile OTP for the student and parent apps — no password.
 *
 *   1. POST otp-login/request  { role, mobile }                → OTP by SMS
 *   2. POST otp-login/verify   { role, mobile, otp }           → login payload,
 *        or { needsSelection, selectionToken, accounts[] } when the number
 *        belongs to more than one account (siblings / two schools)
 *   3. POST otp-login/select   { selectionToken, accountId }   → login payload
 *
 * The number is the one the school recorded at admission:
 *   STUDENT → Student.phone (the student's own mobile)
 *   PARENT  → Parent.phone, or Student.parentPhone — a guardian the school
 *             never made a Parent record for gets one (and its child links) on
 *             their first verified OTP.
 *
 * Step 1 always returns the same generic answer — registered or not, in
 * cooldown or capped — so it cannot be used to probe which numbers are known.
 * The login payload is the same one the password login returns.
 */

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60;
const SELECT_TOKEN_TTL_SECONDS = 5 * 60;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_RESENDS = 3;
const MAX_SMS_PER_HOUR = 5; // per role + number, across requests
const MAX_ACCOUNTS = 10;
const BCRYPT_ROUNDS = 10;

const ERR = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_MOBILE: 'INVALID_MOBILE',
  OTP_INVALID: 'OTP_INVALID',
  OTP_LOCKED: 'OTP_LOCKED',
  ACCOUNT_NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  SELECTION_INVALID: 'SELECTION_INVALID',
};

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

/**
 * Who may sign in: an ACTIVE record whose app login was not switched off by
 * the school and not deleted by the user. No password is needed.
 */
const LOGIN_OPEN = {
  status: 'ACTIVE',
  'account.accountStatus': { $ne: 'INACTIVE' },
  appAccountDeletedAt: null,
};

function parseRole(role) {
  const key = String(role || '').trim().toUpperCase();
  if (!OTP_LOGIN_ROLES.includes(key)) {
    throw new AppError('A valid role is required', 400, ERR.VALIDATION_ERROR);
  }
  return key;
}

function parseMobile(body) {
  const digits = toMobileDigits(body.mobile || body.phone || body.identifier);
  if (!isValidMobile(digits)) {
    throw new AppError('Enter a valid 10-digit mobile number', 400, ERR.INVALID_MOBILE);
  }
  return digits;
}

function generateOtp() {
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

const genericSent = () => ({
  message: 'If this number is registered with your school, an OTP has been sent to it.',
  otpLength: OTP_LENGTH,
  expiresIn: OTP_TTL_SECONDS,
  resendIn: RESEND_COOLDOWN_SECONDS,
});

const fullName = (doc) => [doc.firstName, doc.lastName].filter(Boolean).join(' ').trim();

/** Students whose guardian number (as recorded at admission) is this one. */
function wardsOf(phone) {
  return Student.find({ parentPhone: { $in: mobileVariants(phone) }, status: 'ACTIVE' })
    .select('schoolId parentName')
    .lean();
}

/** Is there anything an OTP for this number could sign in to? */
async function hasCandidate(role, phone) {
  const variants = mobileVariants(phone);
  if (role === 'STUDENT') return Boolean(await Student.exists({ phone: { $in: variants }, ...LOGIN_OPEN }));
  if (await Parent.exists({ phone: { $in: variants }, ...LOGIN_OPEN })) return true;
  return Boolean(await Student.exists({ parentPhone: { $in: variants }, status: 'ACTIVE' }));
}

/**
 * Give the guardian number a Parent record per school and link its children.
 * Runs only AFTER the OTP is verified — holding the phone the school recorded
 * as the guardian's is the proof. A Parent the school disabled (or the user
 * deleted) is left alone, and a link the school removed is never re-opened.
 */
async function provisionParents(phone) {
  const wards = await wardsOf(phone);
  const bySchool = new Map();
  for (const s of wards) {
    const key = String(s.schoolId);
    if (!bySchool.has(key)) bySchool.set(key, []);
    bySchool.get(key).push(s);
  }

  for (const students of bySchool.values()) {
    const { schoolId } = students[0];
    let parent = await Parent.findOne({ schoolId, phone: { $in: mobileVariants(phone) } }).select('_id').lean();
    if (!parent) {
      const [firstName, ...rest] = String(students[0].parentName || '').trim().split(/\s+/).filter(Boolean);
      parent = await Parent.create({
        schoolId,
        firstName: firstName || 'Parent',
        lastName: rest.join(' '),
        phone,
        status: 'ACTIVE',
        account: { createLoginAccount: true, accountStatus: 'ACTIVE' },
      });
    }
    await Promise.all(
      students.map((s) =>
        ParentStudent.updateOne(
          { parentId: parent._id, studentId: s._id },
          { $setOnInsert: { schoolId, parentId: parent._id, studentId: s._id, relationship: 'GUARDIAN', status: 'ACTIVE' } },
          { upsert: true }
        )
      )
    );
  }
}

function findAccounts(role, phone) {
  const Model = role === 'STUDENT' ? Student : Parent;
  return Model.find({ phone: { $in: mobileVariants(phone) }, ...LOGIN_OPEN })
    .sort({ createdAt: 1 })
    .limit(MAX_ACCOUNTS);
}

async function issueSession(role, account) {
  // PENDING = the school made the record but never issued a password. The
  // guards only let '' / ACTIVE through, so a verified OTP completes it.
  if (account.account?.accountStatus === 'PENDING') {
    account.set('account.accountStatus', 'ACTIVE');
    await account.save();
  }
  const service = role === 'STUDENT' ? studentAuthService : parentAuthService;
  return service.sessionFor(account);
}

/** What the "choose account" list shows — nothing the holder of the phone shouldn't see. */
async function accountCards(role, accounts) {
  const schools = await School.find({ _id: { $in: accounts.map((a) => a.schoolId) } }).select('name').lean();
  const schoolName = new Map(schools.map((s) => [String(s._id), s.name]));
  return accounts.map((a) => ({
    id: a._id.toString(),
    name: fullName(a),
    photo: a.photo || '',
    schoolName: schoolName.get(String(a.schoolId)) || '',
    detail: role === 'STUDENT' && a.admissionNumber ? `Adm. No. ${a.admissionNumber}` : '',
  }));
}

class OtpLoginService {
  async requestOtp(body = {}) {
    const role = parseRole(body.role);
    const phone = parseMobile(body);

    if (!(await hasCandidate(role, phone))) {
      await checkRoleMismatch(role, phone);
      return genericSent();
    }

    const now = new Date();
    const recent = await LoginOtp.find({ role, phone, createdAt: { $gt: new Date(now.getTime() - 60 * 60 * 1000) } })
      .select('resendCount')
      .lean();
    const sentThisHour = recent.reduce((sum, s) => sum + 1 + (s.resendCount || 0), 0);
    // Silent no-op: the answer must look identical to a fresh send.
    if (sentThisHour >= MAX_SMS_PER_HOUR) return genericSent();

    let session = await LoginOtp.findOne({ role, phone, status: 'OTP_SENT', otpExpiresAt: { $gt: now } }).sort({
      createdAt: -1,
    });
    if (session) {
      const elapsed = (now - new Date(session.lastOtpSentAt || session.createdAt)) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS || session.resendCount >= MAX_RESENDS) return genericSent();
      session.resendCount += 1;
    } else {
      session = new LoginOtp({ role, phone });
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
        message: `${otp} is your School CRM login OTP. It expires in ${OTP_TTL_SECONDS / 60} minutes. Do not share it with anyone.`,
        template: 'LOGIN_OTP',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[otp-login] OTP SMS failed:', error.code || error.message);
    }

    return genericSent();
  }

  async verifyOtp(body = {}) {
    const role = parseRole(body.role);
    const phone = parseMobile(body);
    const otp = String(body.otp || '').trim();
    if (!/^\d+$/.test(otp)) throw new AppError('Enter the OTP sent to your mobile', 400, ERR.VALIDATION_ERROR);

    const invalid = new AppError('The OTP is invalid or has expired', 400, ERR.OTP_INVALID);
    const session = await LoginOtp.findOne({ role, phone, status: 'OTP_SENT', otpExpiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .select('+otpHash');
    if (!session) throw invalid;

    if (session.otpAttempts >= MAX_OTP_ATTEMPTS) {
      throw new AppError('Too many wrong attempts. Please request a new OTP.', 429, ERR.OTP_LOCKED);
    }

    const ok = await bcrypt.compare(otp, session.otpHash || '').catch(() => false);
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

    // Claim atomically — an OTP signs in once, even if two requests race.
    const claimed = await LoginOtp.findOneAndUpdate(
      { _id: session._id, status: 'OTP_SENT' },
      { $set: { status: 'USED', otpHash: '' } }
    );
    if (!claimed) throw invalid;

    if (role === 'PARENT') await provisionParents(phone);
    const accounts = await findAccounts(role, phone);
    if (!accounts.length) {
      await checkRoleMismatch(role, phone);
      throw new AppError(
        'No active account is linked to this mobile number. Please contact your school office.',
        403,
        ERR.ACCOUNT_NOT_FOUND
      );
    }
    if (accounts.length === 1) return issueSession(role, accounts[0]);

    const selectionToken = crypto.randomBytes(32).toString('hex');
    await LoginOtp.updateOne(
      { _id: session._id },
      {
        $set: {
          status: 'VERIFIED',
          selectTokenHash: sha256(selectionToken),
          selectTokenExpiresAt: new Date(Date.now() + SELECT_TOKEN_TTL_SECONDS * 1000),
        },
      }
    );
    return {
      needsSelection: true,
      selectionToken,
      expiresIn: SELECT_TOKEN_TTL_SECONDS,
      accounts: await accountCards(role, accounts),
    };
  }

  async selectAccount(body = {}) {
    const selectionToken = String(body.selectionToken || '').trim();
    const accountId = String(body.accountId || '').trim();
    if (!selectionToken || !accountId) {
      throw new AppError('Please choose an account', 400, ERR.VALIDATION_ERROR);
    }

    const expired = new AppError('Your sign-in session has expired. Please start again.', 400, ERR.SELECTION_INVALID);
    const filter = {
      selectTokenHash: sha256(selectionToken),
      status: 'VERIFIED',
      selectTokenExpiresAt: { $gt: new Date() },
    };
    const session = await LoginOtp.findOne(filter);
    if (!session) throw expired;

    // The choice is only ever among the accounts this verified number owns.
    const accounts = await findAccounts(session.role, session.phone);
    const account = accounts.find((a) => a._id.toString() === accountId);
    if (!account) throw new AppError('Please choose an account', 400, ERR.VALIDATION_ERROR);

    const claimed = await LoginOtp.findOneAndUpdate(
      { ...filter, _id: session._id },
      { $set: { status: 'USED', selectTokenHash: '' } }
    );
    if (!claimed) throw expired;

    return issueSession(session.role, account);
  }
}

export const otpLoginService = new OtpLoginService();
export { OTP_LENGTH, MAX_OTP_ATTEMPTS, MAX_SMS_PER_HOUR };
