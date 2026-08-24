import { AppError } from '../../../shared/AppError.js';

export function assertSchoolAccess(req, res, next) {
  const routeSchoolId = String(req.params.schoolId || '').toLowerCase();
  const userSchoolId = String(req.user?.schoolId || '').toLowerCase();

  if (!routeSchoolId || !userSchoolId || routeSchoolId !== userSchoolId) {
    next(new AppError('Forbidden', 403));
    return;
  }

  next();
}
