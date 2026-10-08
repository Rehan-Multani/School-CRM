import { parentAccessService } from '../../services/parentAccess.service.js';
import { parentPickupService } from '../../services/parentPickup.service.js';

async function childCtx(req) {
  return parentAccessService.resolveChild(req, req.params.childId);
}

export async function listPickup(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const { data, active, pagination } = await parentPickupService.list(await childCtx(req), req.query);
    res.json({ success: true, data, active, pagination });
  } catch (e) { next(e); }
}

export async function getPickup(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: await parentPickupService.get(await childCtx(req), req.params.sessionId) });
  } catch (e) { next(e); }
}

// Live pickups across all of the parent's children (the Home banner).
export async function activePickups(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store');
    const ctx = await parentAccessService.loadContext(req);
    res.json({ success: true, data: await parentPickupService.activeForParent(ctx) });
  } catch (e) { next(e); }
}
