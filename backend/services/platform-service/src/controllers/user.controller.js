import { userService } from '../services/user.service.js';
import { collectSchoolUserUploadFiles } from '../middleware/uploadSchoolUser.js';
import { deleteUploadedFile } from '../utils/upload.utils.js';
import { auditLogService } from '../services/auditLog.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub;
}

function cleanupUploadedFiles(files) {
  if (!files) return;
  if (files.photo) deleteUploadedFile(files.photo);
  if (Array.isArray(files.documents)) {
    files.documents.forEach((doc) => deleteUploadedFile(doc));
  }
}

export async function listUsers(req, res, next) {
  try {
    const result = await userService.listUsers(schoolId(req), req.query);
    res.json({
      success: true,
      data: result.data,
      stats: result.stats,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const data = await userService.getUser(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  const uploadFiles = collectSchoolUserUploadFiles(req);
  try {
    const data = await userService.createUser(schoolId(req), req.body, uploadFiles);
    auditLogService.record(req, { module: 'USERS', action: 'CREATE', entityType: 'SchoolUser', entityId: data?.id, summary: `Created ${data?.role || 'staff'} account ${data?.email || ''}` });
    res.status(201).json({ success: true, data, message: 'User created successfully' });
  } catch (error) {
    cleanupUploadedFiles(uploadFiles);
    next(error);
  }
}

export async function updateUser(req, res, next) {
  const uploadFiles = collectSchoolUserUploadFiles(req);
  try {
    const data = await userService.updateUser(schoolId(req), req.params.id, req.body, uploadFiles);
    res.json({ success: true, data, message: 'User updated successfully' });
  } catch (error) {
    cleanupUploadedFiles(uploadFiles);
    next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const data = await userService.updateUserStatus(schoolId(req), req.params.id, req.body.status);
    res.json({ success: true, data, message: 'User status updated' });
  } catch (error) {
    next(error);
  }
}

export async function changeUserPassword(req, res, next) {
  try {
    const result = await userService.changeUserPassword(schoolId(req), req.params.id, req.body.password);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

export async function sendUserCredentials(req, res, next) {
  try {
    const result = await userService.sendUserCredentials(schoolId(req), req.params.id);
    res.json({ success: true, data: result, message: result.message });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const result = await userService.deleteUser(schoolId(req), req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

export async function seedUsers(req, res, next) {
  try {
    const { seedStaffUsers } = await import('../seedStaffUsers.js');
    const seeded = await seedStaffUsers();
    res.json({ success: true, message: `Staff users seeded successfully (${seeded} records)` });
  } catch (error) {
    next(error);
  }
}

