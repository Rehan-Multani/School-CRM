import { schoolDashboardService } from '../services/schoolDashboard.service.js';

function schoolId(req) {
  return req.user?.sub || req.schoolAdmin?.schoolId || req.user?.schoolId;
}

export async function getSchoolAdminDashboardSummary(req, res, next) {
  try {
    const data = await schoolDashboardService.getDashboardSummary(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
