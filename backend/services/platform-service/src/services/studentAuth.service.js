import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { Student } from '../models/Student.js';
import { School } from '../models/School.js';
import { schoolThemeSnapshot } from './school.service.js';
import { studentAccessService } from './studentAccess.service.js';
import { studentSelf } from '../serializers/student.serializers.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';
import { checkRoleMismatch } from './roleMismatch.service.js';

const BCRYPT_ROUNDS = 10; // matches teacher/principal/HR login provisioning
const MIN_PASSWORD_LEN = 8;

/** `tv` = Student.tokenVersion at signing time — see requireStudent (revocation). */
function signStudentToken(student) {
  const id = student._id.toString();
  return signAccessToken(
    {
      sub: id,
      userId: id,
      studentId: id,
      schoolId: student.schoolId ? student.schoolId.toString() : '',
      role: 'STUDENT',
      name: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
      admissionNumber: student.admissionNumber || '',
      tv: student.tokenVersion || 0,
    },
    { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
  );
}

class StudentAuthService {
  /**
   * @param {{ identifier?: string, email?: string, username?: string, admissionNumber?: string, password?: string }} body
   * All failure paths return the SAME generic 401 so an attacker cannot probe
   * which students exist / are active.
   */
  async login(body = {}) {
    const identifier = String(
      body.identifier || body.email || body.username || body.admissionNumber || ''
    )
      .trim()
      .toLowerCase();
    const password = String(body.password || '').trim();
    if (!identifier || !password) {
      throw new AppError('Login ID and password are required', 400, STUDENT_ERR.VALIDATION_ERROR);
    }

    const idRegex = new RegExp(`^${escapeRegex(identifier)}$`, 'i');
    const invalid = new AppError('Invalid login ID or password', 401, STUDENT_ERR.INVALID_CREDENTIALS);

    // Prefer an exact email match; only fall back to username / admission number
    // (unique only *within* a school) when no email matches.
    let candidates = await Student.find({
      $or: [{ 'account.loginEmail': identifier }, { email: identifier }],
    })
      .select('+passwordHash')
      .limit(3);
    if (!candidates.length) {
      candidates = await Student.find({
        $or: [{ 'account.username': idRegex }, { admissionNumber: idRegex }],
      })
        .select('+passwordHash')
        .limit(3);
    }
    if (candidates.length > 1) {
      throw new AppError(
        'This login is registered at more than one school. Please contact your school office.',
        409,
        STUDENT_ERR.VALIDATION_ERROR
      );
    }
    const student = candidates[0];
    if (!student || !student.passwordHash) {
      await checkRoleMismatch('STUDENT', identifier);
      throw invalid;
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(password, student.passwordHash);
    } catch {
      ok = false;
    }
    if (!ok) throw invalid;

    if (student.status && student.status !== 'ACTIVE') {
      throw new AppError('This student account is not active. Contact your school office.', 403, STUDENT_ERR.STUDENT_INACTIVE);
    }
    const acctStatus = student.account?.accountStatus || '';
    if (acctStatus && acctStatus !== 'ACTIVE') {
      throw new AppError('This student login has been disabled. Contact your school office.', 403, STUDENT_ERR.STUDENT_INACTIVE);
    }

    return this.sessionFor(student);
  }

  /**
   * Token + login payload for a student whose identity is ALREADY proven
   * (password above, or mobile OTP in otpLogin.service.js).
   */
  async sessionFor(student) {
    const schoolIdStr = student.schoolId ? student.schoolId.toString() : '';
    const school = student.schoolId ? await School.findById(student.schoolId) : null;
    const ctx = await studentAccessService.buildContext(schoolIdStr, student._id.toString());

    const token = signStudentToken(student);

    Student.updateOne({ _id: student._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const self = studentSelf(student, ctx);
    return {
      token,
      student: self,
      // Common alias so a multi-role app can read `data.user` for every flow.
      user: { ...self, role: 'STUDENT' },
      school: {
        id: schoolIdStr,
        name: school?.name || '',
        academicSession: school?.academic?.session || ctx.academicYearName || '',
        ...schoolThemeSnapshot(school),
      },
    };
  }

  async me(schoolId, studentId) {
    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) throw new AppError('Student profile not found', 404, STUDENT_ERR.STUDENT_NOT_FOUND);
    const [school, ctx] = await Promise.all([
      School.findById(schoolId),
      studentAccessService.buildContext(String(schoolId), String(studentId)),
    ]);
    const self = studentSelf(student, ctx);
    return {
      student: self,
      user: { ...self, role: 'STUDENT' },
      school: {
        id: String(schoolId),
        name: school?.name || '',
        academicSession: school?.academic?.session || ctx.academicYearName || '',
        ...schoolThemeSnapshot(school),
      },
    };
  }

  async changePassword(schoolId, studentId, { currentPassword, newPassword } = {}) {
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new password are required', 400, STUDENT_ERR.VALIDATION_ERROR);
    }
    if (String(newPassword).length < MIN_PASSWORD_LEN) {
      throw new AppError(`New password must be at least ${MIN_PASSWORD_LEN} characters`, 400, STUDENT_ERR.PASSWORD_TOO_SHORT);
    }

    const student = await Student.findOne({ _id: studentId, schoolId }).select('+passwordHash');
    if (!student) throw new AppError('Student profile not found', 404, STUDENT_ERR.STUDENT_NOT_FOUND);

    const ok = student.passwordHash ? await bcrypt.compare(currentPassword, student.passwordHash) : false;
    if (!ok) throw new AppError('Current password is incorrect', 401, STUDENT_ERR.CURRENT_PASSWORD_INVALID);

    if (await bcrypt.compare(String(newPassword), student.passwordHash)) {
      throw new AppError('New password must be different from the current one', 400, STUDENT_ERR.VALIDATION_ERROR);
    }

    student.passwordHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
    student.mustResetPassword = false;
    await student.save(); // pre-save bumps tokenVersion → every other session is revoked
    // Hand this device a fresh token so only the OTHER sessions are logged out.
    return { message: 'Password updated successfully', token: signStudentToken(student) };
  }

  /** Logout revokes every outstanding token for this student (all devices). */
  async logout(schoolId, studentId) {
    await Student.updateOne({ _id: studentId, schoolId }, { $inc: { tokenVersion: 1 } });
  }
}

export const studentAuthService = new StudentAuthService();
export { BCRYPT_ROUNDS as STUDENT_BCRYPT_ROUNDS, MIN_PASSWORD_LEN };
