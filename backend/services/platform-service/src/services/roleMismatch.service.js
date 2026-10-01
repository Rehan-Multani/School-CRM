import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { Student } from '../models/Student.js';
import { Parent } from '../models/Parent.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { toMobileDigits, mobileVariants } from '../utils/mobile.js';
import { AppError } from '../../../shared/AppError.js';

export const ROLE_LABELS = {
  TEACHER: 'Teacher',
  TRANSPORT: 'Transport Manager',
  STUDENT: 'Student',
  PARENT: 'Parent',
};

/**
 * Given an attempted role and a login identifier (email, username, employee ID,
 * admission number, or mobile number), checks whether this identifier actually
 * belongs to one of the other 3 roles across the platform.
 *
 * @param {'TEACHER'|'TRANSPORT'|'STUDENT'|'PARENT'} attemptedRole
 * @param {string} identifier
 * @returns {Promise<'TEACHER'|'TRANSPORT'|'STUDENT'|'PARENT'|null>}
 */
export async function detectRoleForIdentifier(attemptedRole, identifier) {
  const raw = String(identifier || '').trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const digits = toMobileDigits(raw);
  const variants = digits ? mobileVariants(digits) : [];
  const idRegex = new RegExp(`^${escapeRegex(raw)}$`, 'i');

  // 1. Check TEACHER
  if (attemptedRole !== 'TEACHER') {
    const isTeacher = await Teacher.exists({
      $or: [
        { 'account.loginEmail': lower },
        { email: lower },
        { 'account.username': idRegex },
        { employeeId: idRegex },
        ...(variants.length ? [{ phone: { $in: variants } }, { mobileNumber: { $in: variants } }] : []),
      ],
      status: { $ne: 'DELETED' },
    });
    if (isTeacher) return 'TEACHER';

    const isStaffTeacher = await SchoolUser.exists({
      role: 'TEACHER',
      $or: [
        { email: lower },
        { employeeId: idRegex },
        ...(variants.length ? [{ phone: { $in: variants } }] : []),
      ],
      status: { $ne: 'DELETED' },
    });
    if (isStaffTeacher) return 'TEACHER';
  }

  // 2. Check TRANSPORT
  if (attemptedRole !== 'TRANSPORT') {
    const isTransport = await SchoolUser.exists({
      role: 'TRANSPORT',
      $or: [
        { email: lower },
        { employeeId: idRegex },
        ...(variants.length ? [{ phone: { $in: variants } }] : []),
      ],
      status: { $ne: 'DELETED' },
    });
    if (isTransport) return 'TRANSPORT';
  }

  // 3. Check STUDENT
  if (attemptedRole !== 'STUDENT') {
    const isStudent = await Student.exists({
      $or: [
        { 'account.loginEmail': lower },
        { email: lower },
        { 'account.username': idRegex },
        { admissionNumber: idRegex },
        ...(variants.length ? [{ phone: { $in: variants } }] : []),
      ],
      status: { $ne: 'DELETED' },
    });
    if (isStudent) return 'STUDENT';
  }

  // 4. Check PARENT
  if (attemptedRole !== 'PARENT') {
    const isParent = await Parent.exists({
      $or: [
        { 'account.loginEmail': lower },
        { email: lower },
        { 'account.username': idRegex },
        ...(variants.length ? [{ phone: { $in: variants } }] : []),
      ],
      status: { $ne: 'DELETED' },
    });
    if (isParent) return 'PARENT';

    if (variants.length) {
      const isGuardian = await Student.exists({
        parentPhone: { $in: variants },
        status: { $ne: 'DELETED' },
      });
      if (isGuardian) return 'PARENT';
    }
  }

  return null;
}

/**
 * Validates that an identifier does not belong to another role.
 * If a mismatch is detected, throws a clear, user-friendly 403 AppError:
 * e.g. "You are not a Transport Manager. Please sign in as Teacher."
 *
 * @param {'TEACHER'|'TRANSPORT'|'STUDENT'|'PARENT'} attemptedRole
 * @param {string} identifier
 */
export async function checkRoleMismatch(attemptedRole, identifier) {
  const foundRole = await detectRoleForIdentifier(attemptedRole, identifier);
  if (foundRole) {
    const attemptedLabel = ROLE_LABELS[attemptedRole] || attemptedRole;
    const foundLabel = ROLE_LABELS[foundRole] || foundRole;
    const message = `You are not a ${attemptedLabel}. Please sign in as ${foundLabel}.`;
    const err = new AppError(message, 403, 'ROLE_MISMATCH');
    err.suggestedRole = foundRole;
    throw err;
  }
}
