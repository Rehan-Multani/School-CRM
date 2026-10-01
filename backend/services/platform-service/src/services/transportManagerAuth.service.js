import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { School } from '../models/School.js';
import { schoolThemeSnapshot } from './school.service.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';
import { checkRoleMismatch } from './roleMismatch.service.js';

/**
 * Sign-in for the Transport Manager app. The manager is a staff account — a
 * `SchoolUser` with role TRANSPORT, created by the school in Users with an
 * email and password. (A `Driver` is only a record on a vehicle and a route;
 * the person who runs the buses day to day is the manager.)
 */

const MIN_PASSWORD_LEN = 8;
const BCRYPT_ROUNDS = 10;
const ROLE = 'TRANSPORT';

function managerSelf(user) {
  return {
    id: user._id.toString(),
    employeeId: user.employeeId || '',
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    photo: user.photo || '',
    designation: user.designation || '',
    department: user.department || '',
    status: user.status,
  };
}

/** `tv` = SchoolUser.tokenVersion at signing time — see requireTransportManager (revocation). */
function signManagerToken(user) {
  const id = user._id.toString();
  return signAccessToken(
    {
      sub: id,
      userId: id,
      schoolId: user.schoolId.toString(),
      role: ROLE,
      name: user.name,
      email: user.email,
      tv: user.tokenVersion || 0,
    },
    { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
  );
}

function schoolBlock(school, schoolId) {
  return {
    id: String(schoolId),
    name: school?.name || '',
    academicSession: school?.academic?.session || '',
    ...schoolThemeSnapshot(school),
  };
}

class TransportManagerAuthService {
  /**
   * Email (or employee ID) + password. Every failure before the password is
   * proven returns the SAME generic 401, so the endpoint cannot be used to
   * probe which staff emails exist.
   */
  async login(body = {}) {
    const identifier = String(body.identifier || body.email || body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    if (!identifier || !password) {
      throw new AppError('Email and password are required', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }

    const invalid = new AppError('Invalid email or password', 401, TRANSPORT_ERR.INVALID_CREDENTIALS);

    // Email is unique per school, not globally; employee ID likewise — the
    // same login at two schools has to be told apart by a human.
    let candidates = await SchoolUser.find({ role: ROLE, email: identifier }).select('+passwordHash').limit(3);
    if (!candidates.length) {
      candidates = await SchoolUser.find({ role: ROLE, employeeId: new RegExp(`^${escapeRegex(identifier)}$`, 'i') })
        .select('+passwordHash')
        .limit(3);
    }
    if (candidates.length > 1) {
      throw new AppError(
        'This login is registered at more than one school. Please contact your school office.',
        409,
        TRANSPORT_ERR.VALIDATION_ERROR
      );
    }
    const user = candidates[0];
    if (!user || !user.passwordHash) {
      await checkRoleMismatch(ROLE, identifier);
      throw invalid;
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.passwordHash);
    } catch {
      ok = false;
    }
    if (!ok) throw invalid;

    if (user.status !== 'ACTIVE') {
      throw new AppError(
        'This transport manager account is not active. Contact your school office.',
        403,
        TRANSPORT_ERR.MANAGER_INACTIVE
      );
    }

    const school = await School.findById(user.schoolId);
    const token = signManagerToken(user);

    SchoolUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const self = managerSelf(user);
    return {
      token,
      manager: self,
      // Common alias so a multi-role app can read `data.user` for every flow.
      user: { ...self, role: ROLE },
      school: schoolBlock(school, user.schoolId),
    };
  }

  async me(schoolId, userId) {
    const user = await SchoolUser.findOne({ _id: userId, schoolId, role: ROLE });
    if (!user) throw new AppError('Transport manager profile not found', 404, TRANSPORT_ERR.NOT_FOUND);
    const school = await School.findById(schoolId);
    const self = managerSelf(user);
    return { manager: self, user: { ...self, role: ROLE }, school: schoolBlock(school, schoolId) };
  }

  async changePassword(schoolId, userId, body = {}) {
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new password are required', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    if (newPassword.length < MIN_PASSWORD_LEN) {
      throw new AppError(
        `New password must be at least ${MIN_PASSWORD_LEN} characters`,
        400,
        TRANSPORT_ERR.VALIDATION_ERROR
      );
    }

    const user = await SchoolUser.findOne({ _id: userId, schoolId, role: ROLE }).select('+passwordHash');
    if (!user) throw new AppError('Transport manager profile not found', 404, TRANSPORT_ERR.NOT_FOUND);

    let ok = false;
    try {
      ok = await bcrypt.compare(currentPassword, user.passwordHash || '');
    } catch {
      ok = false;
    }
    // Same code the other app roles use — the shared change-password screen keys on it.
    if (!ok) throw new AppError('Current password is incorrect', 401, 'CURRENT_PASSWORD_INVALID');

    // updateOne, not save(): a staff record written by an older form may not
    // pass today's validators, and a password change must not fail on that.
    const tokenVersion = (user.tokenVersion || 0) + 1;
    await SchoolUser.updateOne(
      { _id: user._id },
      { $set: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), tokenVersion } }
    );
    user.tokenVersion = tokenVersion; // other sessions end; this device gets a fresh token
    return { changed: true, token: signManagerToken(user) };
  }

  /** Logout ends every app session of this manager (all devices). */
  async logout(schoolId, userId) {
    await SchoolUser.updateOne({ _id: userId, schoolId, role: ROLE }, { $inc: { tokenVersion: 1 } });
  }
}

export const transportManagerAuthService = new TransportManagerAuthService();
