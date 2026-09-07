import { parentAccessService } from '../../services/parentAccess.service.js';
import { parentDashboardService } from '../../services/parentDashboard.service.js';
import { AppError } from '../../../../shared/AppError.js';
import { PARENT_ERR } from '../../constants/parentErrorCodes.js';

/**
 * Home dashboard for the currently-selected child. `childId` comes from the
 * query string (the app persists the selected child locally); it is authorized
 * against the ParentStudent link exactly like every other child-scoped route.
 */
export async function getDashboard(req, res, next) {
  try {
    const parentCtx = await parentAccessService.loadContext(req);
    parentAccessService.requireChildren(parentCtx);
    const childId = String(req.query.childId || '') || parentCtx.children[0]?.studentId;
    if (!childId) throw new AppError('childId is required', 400, PARENT_ERR.VALIDATION_ERROR);
    const childRow = parentAccessService.childRow(parentCtx, childId);
    const childCtx = await parentAccessService.resolveChild(req, childId);
    const data = await parentDashboardService.dashboard(parentCtx, childCtx, childRow);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getOverview(req, res, next) {
  try {
    const parentCtx = await parentAccessService.loadContext(req);
    parentAccessService.requireChildren(parentCtx);
    const data = await parentDashboardService.overview(parentCtx, (childId) => parentAccessService.resolveChild(req, childId));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
