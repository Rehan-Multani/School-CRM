import { AppError } from '../../../shared/AppError.js';
import { roleRepository } from '../repositories/role.repository.js';
import { PERMISSION_MODULES, ALL_PERMISSIONS, isValidPermission } from '../config/permissions.js';

function cleanPermissions(input) {
  if (!Array.isArray(input)) return [];
  const set = new Set();
  input.forEach((p) => {
    const v = String(p).trim();
    if (isValidPermission(v)) set.add(v);
  });
  return Array.from(set);
}

function slugKey(name) {
  return String(name)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

class RoleService {
  catalogue() {
    return { modules: PERMISSION_MODULES, all: ALL_PERMISSIONS };
  }

  list(schoolId) {
    return roleRepository.list(schoolId).then((data) => ({ data }));
  }

  async get(schoolId, id) {
    const doc = await roleRepository.findById(schoolId, id);
    if (!doc) throw new AppError('Role not found', 404);
    return doc.toPublicJSON();
  }

  async create(schoolId, payload = {}) {
    const name = (payload.name || '').trim();
    if (!name) throw new AppError('Role name is required', 400);
    const key = payload.key ? slugKey(payload.key) : slugKey(name);
    if (!key) throw new AppError('Role key is invalid', 400);
    const existing = await roleRepository.findByKey(schoolId, key);
    if (existing) throw new AppError('A role with this key already exists', 409);
    const doc = await roleRepository.create(schoolId, {
      name,
      key,
      description: (payload.description || '').trim(),
      isSystem: false,
      permissions: cleanPermissions(payload.permissions),
    });
    return doc.toPublicJSON();
  }

  async update(schoolId, id, payload = {}) {
    const existing = await roleRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Role not found', 404);
    const patch = {};
    if (payload.name !== undefined) {
      const n = (payload.name || '').trim();
      if (!n) throw new AppError('Role name cannot be empty', 400);
      if (!existing.isSystem) patch.name = n;
    }
    if (payload.description !== undefined) patch.description = (payload.description || '').trim();
    if (payload.permissions !== undefined) patch.permissions = cleanPermissions(payload.permissions);
    // system role key is immutable; custom role key immutable after creation
    const doc = await roleRepository.update(schoolId, id, patch);
    return doc.toPublicJSON();
  }

  async remove(schoolId, id) {
    const existing = await roleRepository.findById(schoolId, id);
    if (!existing) throw new AppError('Role not found', 404);
    if (existing.isSystem) throw new AppError('System roles cannot be deleted', 400);
    const users = await roleRepository.countUsers(schoolId, id);
    if (users > 0) throw new AppError(`Cannot delete — ${users} user(s) are assigned this role`, 400);
    await roleRepository.remove(schoolId, id);
    return { success: true, message: 'Role deleted' };
  }

  async assign(schoolId, userId, roleId) {
    if (!userId) throw new AppError('User id is required', 400);
    let roleName = '';
    if (roleId) {
      const role = await roleRepository.findById(schoolId, roleId);
      if (!role) throw new AppError('Role not found', 404);
      roleName = role.name;
    }
    const user = await roleRepository.assignToUser(schoolId, userId, roleId || null, roleName);
    if (!user) throw new AppError('User not found', 404);
    return { success: true, message: roleId ? `Assigned "${roleName}"` : 'Role cleared' };
  }
}

export const roleService = new RoleService();
