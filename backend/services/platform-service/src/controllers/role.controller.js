import { roleService } from '../services/role.service.js';
import { auditLogService } from '../services/auditLog.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub || req.schoolAdmin?.schoolId;
}

export async function getPermissionCatalogue(req, res, next) {
  try {
    res.json({ success: true, data: roleService.catalogue() });
  } catch (error) {
    next(error);
  }
}

export async function listRoles(req, res, next) {
  try {
    const result = await roleService.list(schoolId(req));
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getRole(req, res, next) {
  try {
    const data = await roleService.get(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createRole(req, res, next) {
  try {
    const data = await roleService.create(schoolId(req), req.body);
    auditLogService.record(req, { module: 'ROLES', action: 'CREATE', entityType: 'Role', entityId: data.id, summary: `Created role "${data.name}" (${data.permissions.length} perms)` });
    res.status(201).json({ success: true, data, message: `Role "${data.name}" created` });
  } catch (error) {
    next(error);
  }
}

export async function updateRole(req, res, next) {
  try {
    const data = await roleService.update(schoolId(req), req.params.id, req.body);
    auditLogService.record(req, { module: 'ROLES', action: 'UPDATE', entityType: 'Role', entityId: data.id, summary: `Updated role "${data.name}" permissions` });
    res.json({ success: true, data, message: 'Role updated' });
  } catch (error) {
    next(error);
  }
}

export async function deleteRole(req, res, next) {
  try {
    const result = await roleService.remove(schoolId(req), req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function assignUserRole(req, res, next) {
  try {
    const result = await roleService.assign(schoolId(req), req.params.id, req.body?.roleId);
    auditLogService.record(req, { module: 'ROLES', action: 'ASSIGN', entityType: 'SchoolUser', entityId: req.params.id, summary: result.message });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
