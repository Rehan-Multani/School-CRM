import { deleteAppAccount } from '../../services/appAccount.service.js';
import { teacherAuthService } from '../../services/teacherAuth.service.js';
import { schoolId, teacherId } from '../../utils/tenant.js';
import { auditLogService } from '../../services/auditLog.service.js';
import { collectTeacherUploadFiles } from '../../middleware/uploadTeacherPhoto.js';
import { deleteMulterFiles } from '../../utils/upload.utils.js';
import { teacherProfileService } from '../../services/teacherProfile.service.js';
import { teacherSettingsService } from '../../services/teacherSettings.service.js';

export async function teacherLogin(req, res, next) {
  try {
    const data = await teacherAuthService.login(req.body || {});
    auditLogService.record(
      {
        user: { sub: data.teacher.id, userId: data.teacher.id, schoolId: data.school.id, name: data.teacher.name, role: 'TEACHER' },
        headers: req.headers,
        socket: req.socket,
      },
      { module: 'AUTH', action: 'LOGIN', entityType: 'Teacher', entityId: data.teacher.id, summary: `Teacher ${data.teacher.name} logged in` }
    );
    res.json({ success: true, message: 'Login successful', ...data });
  } catch (error) {
    next(error);
  }
}

export async function teacherLogout(req, res, next) {
  try {
    await teacherAuthService.logout(schoolId(req), teacherId(req));
    auditLogService.record(req, { module: 'AUTH', action: 'LOGOUT', entityType: 'Teacher', entityId: teacherId(req), summary: 'Teacher logged out' });
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

export async function teacherMe(req, res, next) {
  try {
    const data = await teacherAuthService.me(schoolId(req), teacherId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function teacherChangePassword(req, res, next) {
  try {
    const data = await teacherAuthService.changePassword(schoolId(req), teacherId(req), req.body || {});
    auditLogService.record(req, { module: 'AUTH', action: 'PASSWORD_CHANGE', entityType: 'Teacher', entityId: teacherId(req), summary: 'Teacher changed password' });
    res.json({ success: true, message: data.message, data: { token: data.token } });
  } catch (error) {
    next(error);
  }
}

export async function teacherDeleteAccount(req, res, next) {
  try {
    const data = await deleteAppAccount('TEACHER', schoolId(req), teacherId(req), req.body || {});
    auditLogService.record(req, {
      module: 'AUTH',
      action: 'ACCOUNT_DELETE',
      entityType: 'Teacher',
      entityId: teacherId(req),
      summary: 'Teacher deleted their app account',
    });
    res.json({ success: true, message: data.message });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherProfile(req, res, next) {
  try {
    const data = await teacherProfileService.getProfile(schoolId(req), teacherId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateTeacherProfile(req, res, next) {
  const files = collectTeacherUploadFiles(req);
  try {
    const data = await teacherProfileService.updateProfile(schoolId(req), teacherId(req), req.body || {}, files);
    auditLogService.record(req, { module: 'PROFILE', action: 'UPDATE', entityType: 'Teacher', entityId: teacherId(req), summary: 'Teacher updated profile' });
    res.json({ success: true, data, message: 'Profile updated' });
  } catch (error) {
    deleteMulterFiles(req.files);
    next(error);
  }
}

export async function getTeacherDocuments(req, res, next) {
  try {
    const data = await teacherProfileService.getDocuments(schoolId(req), teacherId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherSettings(req, res, next) {
  try {
    const data = await teacherSettingsService.get(schoolId(req), teacherId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateTeacherSettings(req, res, next) {
  try {
    const data = await teacherSettingsService.update(schoolId(req), teacherId(req), req.body || {});
    res.json({ success: true, data, message: 'Settings updated' });
  } catch (error) {
    next(error);
  }
}
