import { parentAuthService } from '../../services/parentAuth.service.js';
import { parentProfileService } from '../../services/parentProfile.service.js';
import { parentChildrenService } from '../../services/parentChildren.service.js';
import { parentAccessService } from '../../services/parentAccess.service.js';
import { schoolId, parentId } from '../../utils/tenant.js';
import { auditLogService } from '../../services/auditLog.service.js';
import { collectStudentUploadFiles } from '../../middleware/uploadStudentPhoto.js';
import { deleteMulterFiles } from '../../utils/upload.utils.js';

export async function parentLogin(req, res, next) {
  try {
    const data = await parentAuthService.login(req.body || {});
    auditLogService.record(
      {
        user: { sub: data.parent.id, userId: data.parent.id, schoolId: data.school.id, name: data.parent.name, role: 'PARENT' },
        headers: req.headers,
        socket: req.socket,
      },
      { module: 'AUTH', action: 'LOGIN', entityType: 'Parent', entityId: data.parent.id, summary: `Parent ${data.parent.name} logged in` }
    );
    res.json({ success: true, message: 'Login successful', ...data });
  } catch (error) {
    next(error);
  }
}

export async function parentLogout(req, res, next) {
  try {
    auditLogService.record(req, { module: 'AUTH', action: 'LOGOUT', entityType: 'Parent', entityId: parentId(req), summary: 'Parent logged out' });
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

export async function parentMe(req, res, next) {
  try {
    const data = await parentAuthService.me(schoolId(req), parentId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function parentChangePassword(req, res, next) {
  try {
    const data = await parentAuthService.changePassword(schoolId(req), parentId(req), req.body || {});
    auditLogService.record(req, { module: 'AUTH', action: 'PASSWORD_CHANGE', entityType: 'Parent', entityId: parentId(req), summary: 'Parent changed password' });
    res.json({ success: true, message: data.message });
  } catch (error) {
    next(error);
  }
}

export async function getParentProfile(req, res, next) {
  try {
    const ctx = await parentAccessService.loadContext(req);
    res.json({ success: true, data: await parentProfileService.get(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function updateParentProfile(req, res, next) {
  const files = collectStudentUploadFiles(req);
  try {
    const ctx = await parentAccessService.loadContext(req);
    const data = await parentProfileService.update(ctx, req.body || {}, files);
    auditLogService.record(req, { module: 'PROFILE', action: 'UPDATE', entityType: 'Parent', entityId: parentId(req), summary: 'Parent updated profile' });
    res.json({ success: true, data, message: 'Profile updated' });
  } catch (error) {
    deleteMulterFiles(req.files);
    next(error);
  }
}

export async function getParentSettings(req, res, next) {
  try {
    const ctx = await parentAccessService.loadContext(req);
    res.json({ success: true, data: await parentProfileService.getSettings(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function updateParentSettings(req, res, next) {
  try {
    const ctx = await parentAccessService.loadContext(req);
    const data = await parentProfileService.updateSettings(ctx, req.body || {});
    res.json({ success: true, data, message: 'Settings updated' });
  } catch (error) {
    next(error);
  }
}

export async function listChildren(req, res, next) {
  try {
    const ctx = await parentAccessService.loadContext(req);
    res.json({ success: true, data: parentChildrenService.list(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function getChild(req, res, next) {
  try {
    const ctx = await parentAccessService.loadContext(req);
    res.json({ success: true, data: parentChildrenService.profile(ctx, req.params.childId) });
  } catch (error) {
    next(error);
  }
}
