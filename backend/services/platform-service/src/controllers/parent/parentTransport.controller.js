import { parentAccessService } from '../../services/parentAccess.service.js';
import { studentTransportService } from '../../services/studentTransport.service.js';

async function childCtx(req) {
  return parentAccessService.resolveChild(req, req.params.childId);
}

export async function getTransport(req, res, next) {
  try {
    res.json({ success: true, data: await studentTransportService.overview(await childCtx(req)) });
  } catch (e) { next(e); }
}

export async function getTransportHistory(req, res, next) {
  try {
    const { data, pagination } = await studentTransportService.history(await childCtx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}
