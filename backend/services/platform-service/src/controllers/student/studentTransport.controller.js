import { studentAccessService } from '../../services/studentAccess.service.js';
import { studentTransportService } from '../../services/studentTransport.service.js';

export async function getTransport(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    res.json({ success: true, data: await studentTransportService.overview(ctx) });
  } catch (error) {
    next(error);
  }
}

export async function getTransportHistory(req, res, next) {
  try {
    const ctx = await studentAccessService.loadContext(req);
    const { data, pagination } = await studentTransportService.history(ctx, req.query);
    res.json({ success: true, data, pagination });
  } catch (error) {
    next(error);
  }
}
