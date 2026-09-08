import { transportAccessService } from '../../services/transportAccess.service.js';
import { transportAlertService } from '../../services/transportAlert.service.js';
import { transportIncidentService } from '../../services/transportIncident.service.js';
import { auditLogService } from '../../services/auditLog.service.js';

const ctx = (req) => transportAccessService.loadContext(req);

/* ------------------------------ ALERTS ------------------------------ */
export async function listAlerts(req, res, next) {
  try {
    const { data, pagination, meta } = await transportAlertService.list(await ctx(req), req.query);
    res.json({ success: true, data, pagination, meta });
  } catch (e) { next(e); }
}
export async function getAlert(req, res, next) {
  try { res.json({ success: true, data: await transportAlertService.get(await ctx(req), req.params.id) }); } catch (e) { next(e); }
}
export async function markAlertRead(req, res, next) {
  try { res.json({ success: true, ...(await transportAlertService.markRead(await ctx(req), req.params.id)) }); } catch (e) { next(e); }
}
export async function resolveAlert(req, res, next) {
  try {
    const data = await transportAlertService.resolve(await ctx(req), req.params.id, req.body?.note);
    auditLogService.record(req, { module: 'TRANSPORT', action: 'ALERT_RESOLVE', entityType: 'TransportAlert', entityId: req.params.id, summary: 'Alert resolved' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

/* --------------------------- VEHICLE ISSUES --------------------------- */
export async function reportIssue(req, res, next) {
  try {
    const data = await transportIncidentService.reportIssue(await ctx(req), req.params.tripId, req.body || {});
    auditLogService.record(req, { module: 'TRANSPORT', action: 'ISSUE_REPORT', entityType: 'TransportIncident', entityId: data.incidentId, summary: 'Vehicle issue reported' });
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}
export async function listTripIssues(req, res, next) {
  try {
    const { data, pagination } = await transportIncidentService.listTripIssues(await ctx(req), req.params.tripId, req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}

/* -------------------------------- SOS -------------------------------- */
export async function raiseSOS(req, res, next) {
  try {
    const data = await transportIncidentService.raiseSOS(await ctx(req), req.body || {});
    auditLogService.record(req, { module: 'TRANSPORT', action: 'SOS_RAISE', entityType: 'TransportSOS', entityId: data.id, summary: 'SOS raised' });
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}
export async function listSOS(req, res, next) {
  try {
    const { data, pagination } = await transportIncidentService.listSOS(await ctx(req), req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}
export async function getSOS(req, res, next) {
  try { res.json({ success: true, data: await transportIncidentService.getSOS(await ctx(req), req.params.id) }); } catch (e) { next(e); }
}
export async function updateSOS(req, res, next) {
  try {
    const data = await transportIncidentService.updateSOS(await ctx(req), req.params.id, req.body || {});
    auditLogService.record(req, { module: 'TRANSPORT', action: `SOS_${String(req.body?.action || '').toUpperCase()}`, entityType: 'TransportSOS', entityId: req.params.id, summary: `SOS ${req.body?.action}` });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}
