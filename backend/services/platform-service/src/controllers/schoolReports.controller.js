import { schoolReportsService } from '../services/schoolReports.service.js';

function schoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.schoolAdmin?.schoolId || req.user?.sub;
}

export async function getSchoolReportsSummary(req, res, next) {
  try {
    const data = await schoolReportsService.getReportsSummary(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryReportData(req, res, next) {
  try {
    // `category` picks the report; it must not leak into the report's own filters.
    const { category, ...filters } = req.query || {};
    const result = await schoolReportsService.getCategoryReport(schoolId(req), category || 'students', filters);
    res.json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      stats: result.stats || null,
    });
  } catch (error) {
    next(error);
  }
}
