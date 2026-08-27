import { schoolDashboardService } from '../services/schoolDashboard.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.schoolAdmin?.schoolId || req.user?.sub;
}

export async function getSchoolAdminDashboardSummary(req, res, next) {
  try {
    const data = await schoolDashboardService.getDashboardSummary(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
