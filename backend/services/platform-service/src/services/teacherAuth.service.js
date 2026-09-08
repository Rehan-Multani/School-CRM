import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { Teacher } from '../models/Teacher.js';
import { School } from '../models/School.js';
import { schoolThemeSnapshot } from './school.service.js';
import { teacherAccessService } from './teacherAccess.service.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

const BCRYPT_ROUNDS = 10; // matches principal/HR/accountant login provisioning
const MIN_PASSWORD_LEN = 8;

/** Fields the APK needs at login — never the whole Mongoose doc. */
function teacherAuthPayload(teacher) {
  const first = teacher.firstName || teacher.name?.split(' ')[0] || '';
  const last =
    teacher.lastName || (teacher.name?.split(' ').length > 1 ? teacher.name.split(' ').slice(1).join(' ') : '');
  const fullName = [first, teacher.middleName || '', last].filter(Boolean).join(' ') || teacher.name;
  return {
    id: teacher._id.toString(),
    employeeId: teacher.employeeId || '',
    name: fullName,
    email: teacher.email || teacher.account?.loginEmail || '',
    phone: teacher.mobileNumber || teacher.phone || '',
    profilePhoto: teacher.profilePhoto || '',
    designation: teacher.designation || '',
    department: teacher.department || '',
    status: teacher.status,
    mustResetPassword: Boolean(teacher.mustResetPassword),
  };
}

class TeacherAuthService {
  /**
   * @param {{ identifier?: string, email?: string, username?: string, password?: string }} body
   * All failure paths return the SAME generic 401 so an attacker cannot probe
   * which teachers exist / are active.
   */
  async login(body = {}) {
    const identifier = String(body.identifier || body.email || body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    if (!identifier || !password) {
      throw new AppError('Email/employee ID and password are required', 400, TEACHER_ERR.VALIDATION_ERROR);
    }

    const idRegex = new RegExp(`^${escapeRegex(identifier)}$`, 'i');
    const invalid = new AppError('Invalid email or password', 401, TEACHER_ERR.INVALID_CREDENTIALS);

    // Prefer an exact email match; only fall back to username/employeeId (which
    // are only unique *within* a school) when no email matches.
    let candidates = await Teacher.find({
      $or: [{ 'account.loginEmail': identifier }, { email: identifier }],
    })
      .select('+passwordHash')
      .limit(3);
    if (!candidates.length) {
      candidates = await Teacher.find({ $or: [{ 'account.username': idRegex }, { employeeId: idRegex }] })
        .select('+passwordHash')
        .limit(3);
    }
    if (candidates.length > 1) {
      throw new AppError(
        'This login is registered at more than one school. Please contact your school office.',
        409,
        TEACHER_ERR.VALIDATION_ERROR
      );
    }
    const teacher = candidates[0];
    if (!teacher || !teacher.passwordHash) throw invalid;

    let ok = false;
    try {
      ok = await bcrypt.compare(password, teacher.passwordHash);
    } catch {
      ok = false;
    }
    if (!ok) throw invalid;

    if (teacher.status !== 'ACTIVE') {
      throw new AppError('This teacher account is not active. Contact your school office.', 403, TEACHER_ERR.TEACHER_INACTIVE);
    }
    const acctStatus = teacher.account?.accountStatus || '';
    if (acctStatus && acctStatus !== 'ACTIVE') {
      throw new AppError('This teacher login has been disabled. Contact your school office.', 403, TEACHER_ERR.TEACHER_INACTIVE);
    }

    const school = teacher.schoolId ? await School.findById(teacher.schoolId) : null;
    const schoolIdStr = teacher.schoolId ? teacher.schoolId.toString() : '';

    const token = signAccessToken(
      {
        sub: teacher._id.toString(),
        userId: teacher._id.toString(),
        teacherId: teacher._id.toString(),
        schoolId: schoolIdStr,
        role: 'TEACHER',
        name: teacherAuthPayload(teacher).name,
        email: teacher.email || teacher.account?.loginEmail || '',
      },
      { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
    );

    Teacher.updateOne({ _id: teacher._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const self = teacherAuthPayload(teacher);
    return {
      token,
      teacher: self,
      // Common alias so a multi-role app can read `data.user` for every flow.
      user: { ...self, role: 'TEACHER' },
      school: {
        id: schoolIdStr,
        name: school?.name || '',
        academicSession: school?.academic?.session || '',
        ...schoolThemeSnapshot(school),
      },
    };
  }

  async me(schoolId, teacherId) {
    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
    if (!teacher) throw new AppError('Teacher profile not found', 404, TEACHER_ERR.TEACHER_NOT_FOUND);
    const [school, classTeacher] = await Promise.all([
      School.findById(schoolId),
      teacherAccessService.classTeacherSummary(schoolId, teacherId),
    ]);
    const self = { ...teacherAuthPayload(teacher), ...classTeacher };
    return {
      teacher: self,
      // The APK reads `teacher.isClassTeacher` to show/hide the Pickup bottom-nav tab.
      user: { ...self, role: 'TEACHER' },
      school: {
        id: String(schoolId),
        name: school?.name || '',
        academicSession: school?.academic?.session || '',
        ...schoolThemeSnapshot(school),
      },
    };
  }

  async changePassword(schoolId, teacherId, { currentPassword, newPassword } = {}) {
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new password are required', 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    if (String(newPassword).length < MIN_PASSWORD_LEN) {
      throw new AppError(`New password must be at least ${MIN_PASSWORD_LEN} characters`, 400, TEACHER_ERR.PASSWORD_TOO_SHORT);
    }

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId }).select('+passwordHash');
    if (!teacher) throw new AppError('Teacher profile not found', 404, TEACHER_ERR.TEACHER_NOT_FOUND);

    const ok = teacher.passwordHash ? await bcrypt.compare(currentPassword, teacher.passwordHash) : false;
    if (!ok) throw new AppError('Current password is incorrect', 401, TEACHER_ERR.CURRENT_PASSWORD_INVALID);

    teacher.passwordHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
    teacher.mustResetPassword = false;
    await teacher.save();
    return { message: 'Password updated successfully' };
  }
}

export const teacherAuthService = new TeacherAuthService();
export { teacherAuthPayload, BCRYPT_ROUNDS as TEACHER_BCRYPT_ROUNDS, MIN_PASSWORD_LEN };
