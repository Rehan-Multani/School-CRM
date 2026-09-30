import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { Teacher } from '../models/Teacher.js';
import { Student } from '../models/Student.js';
import { Parent } from '../models/Parent.js';
import { Driver } from '../models/Driver.js';
import { DeviceToken } from '../models/DeviceToken.js';

/**
 * Self-service "Delete account" for the four mobile-app roles (Play Store /
 * App Store requirement). Confirmed on-screen by the signed-in user. It removes the app LOGIN:
 *   - password hash cleared  → pre-save bumps tokenVersion → every session ends
 *   - login switched off     (account.accountStatus / Driver.loginEnabled)
 *   - push devices + app-only notification prefs removed
 *   - `appAccountDeletedAt`  stamped (cleared again when an admin issues a new password)
 * What the school holds about the person (enrolment, attendance, marks, fees,
 * HR/payroll, transport) is the school's record and is NOT touched.
 */
const ROLES = {
  TEACHER: { Model: Teacher, deviceRole: 'teacher', label: 'Teacher' },
  STUDENT: { Model: Student, deviceRole: 'student', label: 'Student' },
  PARENT: { Model: Parent, deviceRole: 'parent', label: 'Parent' },
  DRIVER: { Model: Driver, deviceRole: 'transport', label: 'Driver' },
};

export async function deleteAppAccount(role, schoolId, userId, { password } = {}) {
  const cfg = ROLES[role];
  if (!cfg) throw new AppError('Unsupported role', 400, 'VALIDATION_ERROR');
  const doc = await cfg.Model.findOne({ _id: userId, schoolId }).select('+passwordHash');
  if (!doc) throw new AppError(`${cfg.label} not found`, 404, 'NOT_FOUND');
  // The signed-in session (live-checked token) is the proof of identity; the
  // app asks only for an on-screen confirmation. A password, if a client
  // sends one, must still be correct.
  if (password !== undefined && password !== null && password !== '') {
    let ok = false;
    try {
      ok = doc.passwordHash ? await bcrypt.compare(String(password), doc.passwordHash) : false;
    } catch {
      ok = false;
    }
    if (!ok) throw new AppError('Password is incorrect', 401, 'CURRENT_PASSWORD_INVALID');
  }

  doc.passwordHash = '';
  if (role === 'DRIVER') {
    doc.loginEnabled = false;
  } else {
    doc.set('account.accountStatus', 'INACTIVE');
    if (doc.notificationPrefs !== undefined) {
      doc.notificationPrefs = {};
      doc.markModified('notificationPrefs');
    }
  }
  doc.appAccountDeletedAt = new Date();
  await doc.save();
  await DeviceToken.deleteMany({ role: cfg.deviceRole, userId: String(doc._id) });
  return { message: 'Your app account has been deleted' };
}
