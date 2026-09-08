import { transportAccessService } from '../../services/transportAccess.service.js';
import { transportDashboardService } from '../../services/transportDashboard.service.js';

export async function getDashboard(req, res, next) {
  try {
    const ctx = await transportAccessService.loadContext(req);
    res.json({ success: true, data: await transportDashboardService.dashboard(ctx) });
  } catch (e) { next(e); }
}

export async function getDashboardSummary(req, res, next) {
  try {
    const ctx = await transportAccessService.loadContext(req);
    res.json({ success: true, data: await transportDashboardService.summary(ctx) });
  } catch (e) { next(e); }
}
