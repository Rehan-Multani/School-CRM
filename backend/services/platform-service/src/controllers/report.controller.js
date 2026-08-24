import { reportService } from '../services/report.service.js';

export async function getReportSummary(req, res, next) {
  try {
    const data = await reportService.getSummary(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function listSchoolReports(req, res, next) {
  try {
    const result = await reportService.listSchools(req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function listSubscriptionReports(req, res, next) {
  try {
    const data = await reportService.listSubscriptions(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function listNotificationReports(req, res, next) {
  try {
    const result = await reportService.listNotifications(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function listInvoiceReports(req, res, next) {
  try {
    const result = await reportService.listInvoices(req.query);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
}
