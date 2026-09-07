import { parentAccessService } from '../../services/parentAccess.service.js';
import { parentPickupService } from '../../services/parentPickup.service.js';

async function childCtx(req) {
  return parentAccessService.resolveChild(req, req.params.childId);
}

export async function listPickup(req, res, next) {
  try {
    const { data, active, pagination } = await parentPickupService.list(await childCtx(req), req.query);
    res.json({ success: true, data, active, pagination });
  } catch (e) { next(e); }
}

export async function getPickup(req, res, next) {
  try {
    res.json({ success: true, data: await parentPickupService.get(await childCtx(req), req.params.sessionId) });
  } catch (e) { next(e); }
}
