import { AppError } from '../../../shared/AppError.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { Role } from '../models/Role.js';

/**
 * Additive permission guard. Runs AFTER a requireX guard (so req.user is set).
 * - SchoolAdmin always passes.
 * - A staff user with no custom roleId passes (legacy role-based behaviour).
 * - A staff user assigned a custom Role must have the permission (or '*').
 */
export function requirePermission(permission) {
  return async function requirePermissionMw(req, res, next) {
    try {
      const role = (req.user?.role || '').toUpperCase();
      if (role === 'SCHOOLADMIN') return next();

      const userId = req.user?.userId || req.user?.sub;
      if (!userId) return next(); // nothing to resolve — fall back to prior guard

      const user = await SchoolUser.findById(userId).select('roleId').lean();
      if (!user || !user.roleId) return next(); // legacy user — allowed

      const roleDoc = await Role.findById(user.roleId).select('permissions').lean();
      const perms = roleDoc?.permissions || [];
      if (perms.includes('*') || perms.includes(permission)) return next();

      throw new AppError(`Missing permission: ${permission}`, 403);
    } catch (error) {
      if (error instanceof AppError) return next(error);
      return next(new AppError('Permission check failed', 500));
    }
  };
}
