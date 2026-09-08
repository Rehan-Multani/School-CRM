import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { Teacher } from '../models/Teacher.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

// Mirrors studentSettings.service.js / parentProfile settings — the same key
// set so a multi-role app can render one Settings screen for every flow.
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
class TeacherSettingsService {
  async get(schoolId, teacherId) {
    const teacher = await Teacher.findOne({ _id: oid(teacherId), schoolId: oid(schoolId) })
      .select('notificationPrefs account')
      .lean();
    if (!teacher) throw new AppError('Teacher profile not found', 404, TEACHER_ERR.TEACHER_NOT_FOUND);
    return {
      notificationPrefs: { ...DEFAULT_PREFS, ...(teacher.notificationPrefs || {}) },
      account: { loginEmail: teacher.account?.loginEmail || '' },
    };
  }

  async update(schoolId, teacherId, body = {}) {
    const incoming = body.notificationPrefs && typeof body.notificationPrefs === 'object' ? body.notificationPrefs : body;
    const patch = {};
    for (const key of KNOWN_KEYS) {
      if (incoming[key] !== undefined) patch[key] = Boolean(incoming[key]);
    }
    if (!Object.keys(patch).length) {
      throw new AppError('No valid notification preference supplied', 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    const teacher = await Teacher.findOne({ _id: oid(teacherId), schoolId: oid(schoolId) });
    if (!teacher) throw new AppError('Teacher profile not found', 404, TEACHER_ERR.TEACHER_NOT_FOUND);
    teacher.notificationPrefs = { ...DEFAULT_PREFS, ...(teacher.notificationPrefs || {}), ...patch };
    teacher.markModified('notificationPrefs');
    await teacher.save();
    return { notificationPrefs: teacher.notificationPrefs };
  }
}

export const teacherSettingsService = new TeacherSettingsService();
