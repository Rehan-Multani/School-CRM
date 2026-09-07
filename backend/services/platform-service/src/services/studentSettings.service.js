import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { Student } from '../models/Student.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

const DEFAULT_PREFS = {
  homework: true,
  attendance: true,
  exam: true,
  result: true,
  notice: true,
  event: true,
  leave: true,
  fee: true,
  general: true,
};
const KNOWN_KEYS = Object.keys(DEFAULT_PREFS);

/**
 * Only APK-scoped settings live here: per-channel push preferences. Global app
 * settings (theme, language) are client-only; password is under Auth.
 */
class StudentSettingsService {
  async get(ctx) {
    const student = await Student.findOne({ _id: oid(ctx.studentId), schoolId: oid(ctx.schoolId) })
      .select('notificationPrefs account')
      .lean();
    if (!student) throw new AppError('Student profile not found', 404, STUDENT_ERR.STUDENT_NOT_FOUND);
    return {
      notificationPrefs: { ...DEFAULT_PREFS, ...(student.notificationPrefs || {}) },
      account: { loginEmail: student.account?.loginEmail || '' },
    };
  }

  async update(ctx, body = {}) {
    const incoming = body.notificationPrefs && typeof body.notificationPrefs === 'object' ? body.notificationPrefs : body;
    const patch = {};
    for (const key of KNOWN_KEYS) {
      if (incoming[key] !== undefined) patch[key] = Boolean(incoming[key]);
    }
    if (!Object.keys(patch).length) {
      throw new AppError('No valid notification preference supplied', 400, STUDENT_ERR.VALIDATION_ERROR);
    }
    const student = await Student.findOne({ _id: oid(ctx.studentId), schoolId: oid(ctx.schoolId) });
    if (!student) throw new AppError('Student profile not found', 404, STUDENT_ERR.STUDENT_NOT_FOUND);
    student.notificationPrefs = { ...DEFAULT_PREFS, ...(student.notificationPrefs || {}), ...patch };
    student.markModified('notificationPrefs');
    await student.save();
    return { notificationPrefs: student.notificationPrefs };
  }
}

export const studentSettingsService = new StudentSettingsService();
