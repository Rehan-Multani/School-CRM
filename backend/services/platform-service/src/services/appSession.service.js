import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { Teacher } from '../models/Teacher.js';
import { Student } from '../models/Student.js';
import { Parent } from '../models/Parent.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { School } from '../models/School.js';
import { DeviceToken } from '../models/DeviceToken.js';
import { AppForceLogout, APP_ROLES } from '../models/AppForceLogout.js';
import { platformSettingRepository } from '../repositories/platformSetting.repository.js';
import { compareVersions } from './platformSetting.service.js';
import { sendFcm } from './pushEvents.service.js';

/**
 * Administrator controls over the mobile app's sessions and version:
 *
 *   forceLogout     — end every session of the chosen app roles (teacher /
 *                     student / parent / transport manager), for one school
 *                     or every school, and tell the phones why. Super Admin only.
 *   notifyAppUpdate — push "update available / required" to every phone; the
 *                     version numbers themselves live in PlatformSetting and are
 *                     enforced by the app from GET /app-config.
 *
 * Signing out = bumping `tokenVersion`: each role's guard compares it with the
 * `tv` claim on every request, so the next call from any signed-in phone is a
 * 401. The push only makes that happen now rather than on the next tap — a
 * phone that never gets it is signed out all the same.
 */

const ROLE = {
  TEACHER: { Model: Teacher, filter: {}, deviceRole: 'teacher' },
  STUDENT: { Model: Student, filter: {}, deviceRole: 'student' },
  PARENT: { Model: Parent, filter: {}, deviceRole: 'parent' },
  // The transport manager is a staff account; other SchoolUser roles are web-only.
  TRANSPORT: { Model: SchoolUser, filter: { role: 'TRANSPORT' }, deviceRole: 'transport' },
};

const DEFAULT_MESSAGE = 'You have been signed out by the administrator. Please sign in again.';
const MAX_MESSAGE = 300;
// An app token lives 7 days, so an older sign-out can no longer be the reason for a 401.
const NOTICE_WINDOW_MS = 8 * 24 * 60 * 60 * 1000;

/** `'ALL'`, `['ALL']`, or a list of app roles → the validated list. */
function parseRoles(input) {
  const list = (Array.isArray(input) ? input : [input]).map((r) => String(r || '').trim().toUpperCase()).filter(Boolean);
  if (list.includes('ALL')) return [...APP_ROLES];
  const roles = [...new Set(list)];
  if (!roles.length || roles.some((r) => !APP_ROLES.includes(r))) {
    throw new AppError('Choose who to sign out: teachers, students, parents, transport managers, or everyone', 400, 'VALIDATION_ERROR');
  }
  return roles;
}

function parseMessage(input) {
  const message = String(input ?? '').trim();
  if (message.length > MAX_MESSAGE) {
    throw new AppError(`Message must be ${MAX_MESSAGE} characters or fewer`, 400, 'VALIDATION_ERROR');
  }
  return message;
}

async function loadSchool(schoolId) {
  if (!mongoose.isValidObjectId(String(schoolId))) {
    throw new AppError('School not found', 404, 'NOT_FOUND');
  }
  const school = await School.findById(schoolId).select('name schoolId').lean();
  if (!school) throw new AppError('School not found', 404, 'NOT_FOUND');
  return school;
}

/** Device tokens of the app roles — of one school, or of every school. */
function deviceFilter(roles, school) {
  const filter = { role: { $in: roles.map((r) => ROLE[r].deviceRole) } };
  // Tokens are stored under the school slug by the role apps, and under the
  // School _id by the shared /device-tokens route.
  if (school) filter.schoolId = { $in: [school.schoolId, String(school._id)].filter(Boolean) };
  return filter;
}

class AppSessionService {
  /**
   * @param {{ roles: string|string[], schoolId?: string|null, message?: string }} input
   *   `schoolId` null/'' = every school.
   * @param {{ id: string, role: string }} actor
   */
  async forceLogout(input = {}, actor = {}) {
    const roles = parseRoles(input.roles);
    const message = parseMessage(input.message);
    const school = input.schoolId ? await loadSchool(input.schoolId) : null;
    const scope = school ? { schoolId: school._id } : {};

    const affected = {};
    for (const role of roles) {
      const { Model, filter } = ROLE[role];
      // timestamps:false — ending a session is not an edit of the person's record.
      const res = await Model.updateMany({ ...scope, ...filter }, { $inc: { tokenVersion: 1 } }, { timestamps: false });
      affected[role] = res.modifiedCount || 0;
    }

    // Tell the phones, then forget them: a signed-out phone must not keep
    // receiving that user's notifications. It registers again on next sign-in.
    const devices = deviceFilter(roles, school);
    const tokens = (await DeviceToken.find(devices).select('token').lean()).map((d) => d.token);
    let devicesNotified = 0;
    try {
      const delivery = await sendFcm(tokens, {
        title: 'Signed out',
        body: message || DEFAULT_MESSAGE,
        data: { type: 'force_logout' },
      });
      devicesNotified = delivery.success || 0;
    } catch (err) {
      console.error('[app-session] force-logout push failed:', err?.message || err);
    }
    await DeviceToken.deleteMany(devices);

    const record = await AppForceLogout.create({
      schoolId: school?._id || null,
      schoolName: school?.name || '',
      roles,
      message,
      createdBy: actor.id || '',
      createdByRole: actor.role || '',
      affected,
      devicesNotified,
    });
    return record.toPublicJSON();
  }

  /** Newest first. */
  async history() {
    const rows = await AppForceLogout.find({}).sort({ createdAt: -1 }).limit(20);
    return rows.map((r) => r.toPublicJSON());
  }

  /**
   * Public: why was this role at this school signed out? The app asks after a
   * 401 and shows the admin's message when the sign-out is newer than its own
   * login. Carries nothing but that message and a time.
   */
  async latestNotice({ role, schoolId } = {}) {
    const key = String(role || '').trim().toUpperCase();
    if (!APP_ROLES.includes(key)) return null;
    const scopes = [null];
    if (mongoose.isValidObjectId(String(schoolId || ''))) scopes.push(new mongoose.Types.ObjectId(String(schoolId)));
    const row = await AppForceLogout.findOne({
      roles: key,
      schoolId: { $in: scopes },
      createdAt: { $gt: new Date(Date.now() - NOTICE_WINDOW_MS) },
    })
      .sort({ createdAt: -1 })
      .lean();
    if (!row) return null;
    return { id: String(row._id), message: row.message || DEFAULT_MESSAGE, at: row.createdAt };
  }

  /** Push the configured version to every phone; the app then shows its update popup. */
  async notifyAppUpdate() {
    const setting = await platformSettingRepository.findPlatformSetting();
    const latest = setting?.appLatestVersion || '';
    const min = setting?.appMinVersion || '';
    if (!latest) {
      throw new AppError('Save the latest app version first', 400, 'VALIDATION_ERROR');
    }
    // Everyone below the minimum must update; when min == latest that is everyone not on it.
    const required = Boolean(min) && compareVersions(min, latest) === 0;
    const tokens = (await DeviceToken.find(deviceFilter(APP_ROLES, null)).select('token').lean()).map((d) => d.token);
    const delivery = await sendFcm(tokens, {
      title: required ? 'Update required' : 'Update available',
      body:
        setting.appUpdateMessage ||
        (required
          ? `Please update School CRM to version ${latest} to keep using the app.`
          : `Version ${latest} of School CRM is available. Update for the latest improvements.`),
      data: { type: 'app_update', latestVersion: latest, minVersion: min },
    });
    return { devices: tokens.length, delivered: delivery.success || 0, pushConfigured: delivery.configured };
  }
}

export const appSessionService = new AppSessionService();
