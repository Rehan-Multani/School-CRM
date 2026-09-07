import { studentAuthService } from '../../services/studentAuth.service.js';
import { studentProfileService } from '../../services/studentProfile.service.js';
import { studentDocumentsService } from '../../services/studentDocuments.service.js';
import { studentSettingsService } from '../../services/studentSettings.service.js';
import { studentAccessService } from '../../services/studentAccess.service.js';
import { schoolId, studentId } from '../../utils/tenant.js';
import { auditLogService } from '../../services/auditLog.service.js';
import { collectStudentUploadFiles, convertStudentImages } from '../../middleware/uploadStudentPhoto.js';
import { deleteMulterFiles } from '../../utils/upload.utils.js';

export { convertStudentImages };

export async function studentLogin(req, res, next) {
  try {
    const data = await studentAuthService.login(req.body || {});
    auditLogService.record(
      {
        user: { sub: data.student.id, userId: data.student.id, schoolId: data.school.id, name: data.student.name, role: 'STUDENT' },
        headers: req.headers,
        socket: req.socket,
      },
      { module: 'AUTH', action: 'LOGIN', entityType: 'Student', entityId: data.student.id, summary: `Student ${data.student.name} logged in` }
    );
    res.json({ success: true, message: 'Login successful', ...data });
  } catch (error) {
    next(error);
  }
}

export async function studentLogout(req, res, next) {
  try {
    // Stateless JWT — nothing to revoke server-side; the client discards the token.
    auditLogService.record(req, { module: 'AUTH', action: 'LOGOUT', entityType: 'Student', entityId: studentId(req), summary: 'Student logged out' });
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

export async function studentMe(req, res, next) {
  try {
    const data = await studentAuthService.me(schoolId(req), studentId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function studentChangePassword(req, res, next) {
  try {
    const data = await studentAuthService.changePassword(schoolId(req), studentId(req), req.body || {});
    auditLogService.record(req, { module: 'AUTH', action: 'PASSWORD_CHANGE', entityType: 'Student', entityId: studentId(req), summary: 'Student changed password' });
    res.json({ success: true, message: data.message });
  } catch (error) {
    next(error);
  }
}

export async function getStudentProfile(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    const data = await studentProfileService.getProfile(ctx);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateStudentProfile(req, res, next) {
  const files = collectStudentUploadFiles(req);
  try {
    const ctx = await studentAccessService.loadContext(req);
    const data = await studentProfileService.updateProfile(ctx, req.body || {}, files);
    auditLogService.record(req, { module: 'PROFILE', action: 'UPDATE', entityType: 'Student', entityId: studentId(req), summary: 'Student updated profile' });
    res.json({ success: true, data, message: 'Profile updated' });
  } catch (error) {
    deleteMulterFiles(req.files);
    next(error);
  }
}

export async function getStudentAcademicInfo(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    const data = await studentProfileService.academicInfo(ctx);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStudentGuardians(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    const data = await studentProfileService.guardians(ctx);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStudentDocuments(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    const data = await studentDocumentsService.list(ctx);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStudentDocumentGroup(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    const data = await studentDocumentsService.group(ctx, req.params.key);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStudentDocumentDownloadUrl(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    const data = await studentDocumentsService.downloadUrl(ctx, req.query.path);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getStudentSettings(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    const data = await studentSettingsService.get(ctx);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateStudentSettings(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    const data = await studentSettingsService.update(ctx, req.body || {});
    res.json({ success: true, data, message: 'Settings updated' });
  } catch (error) {
    next(error);
  }
}
