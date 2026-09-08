import { transportAccessService } from '../../services/transportAccess.service.js';
import { transportTripService } from '../../services/transportTrip.service.js';
import { transportLocationService } from '../../services/transportLocation.service.js';
import { auditLogService } from '../../services/auditLog.service.js';

const ctx = (req) => transportAccessService.loadContext(req);
const ok = (res, data, pagination) => res.json(pagination ? { success: true, data, pagination } : { success: true, data });

export async function listTrips(req, res, next) {
  try {
    const { data, pagination } = await transportTripService.list(await ctx(req), req.query);
    ok(res, data, pagination);
  } catch (e) { next(e); }
}

export async function tripHistory(req, res, next) {
  try {
    const { data, pagination } = await transportTripService.history(await ctx(req), req.query);
    ok(res, data, pagination);
  } catch (e) { next(e); }
}

export async function getTrip(req, res, next) {
  try { ok(res, await transportTripService.detail(await ctx(req), req.params.id)); } catch (e) { next(e); }
}

export async function createTrip(req, res, next) {
  try {
    const data = await transportTripService.create(await ctx(req), req.body || {}, req.headers['idempotency-key'] || null);
    auditLogService.record(req, { module: 'TRANSPORT', action: 'TRIP_CREATE', entityType: 'Trip', entityId: data.id, summary: 'Trip created' });
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

export async function submitInspection(req, res, next) {
  try {
    const data = await transportTripService.submitInspection(await ctx(req), req.params.id, req.body || {});
    auditLogService.record(req, { module: 'TRANSPORT', action: data.trip && data.passed ? 'INSPECTION_PASS' : 'INSPECTION_FAIL', entityType: 'Trip', entityId: req.params.id, summary: 'Pre-trip inspection submitted' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function getInspection(req, res, next) {
  try { ok(res, await transportTripService.getInspection(await ctx(req), req.params.id)); } catch (e) { next(e); }
}

export async function startTrip(req, res, next) {
  try {
    const data = await transportTripService.start(await ctx(req), req.params.id);
    auditLogService.record(req, { module: 'TRANSPORT', action: 'TRIP_START', entityType: 'Trip', entityId: req.params.id, summary: 'Trip started' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function completeTrip(req, res, next) {
  try {
    const data = await transportTripService.complete(await ctx(req), req.params.id);
    auditLogService.record(req, { module: 'TRANSPORT', action: 'TRIP_COMPLETE', entityType: 'Trip', entityId: req.params.id, summary: 'Trip completed' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function cancelTrip(req, res, next) {
  try {
    const data = await transportTripService.cancel(await ctx(req), req.params.id, req.body?.reason);
    auditLogService.record(req, { module: 'TRANSPORT', action: 'TRIP_CANCEL', entityType: 'Trip', entityId: req.params.id, summary: 'Trip cancelled' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function abortTrip(req, res, next) {
  try {
    const data = await transportTripService.abort(await ctx(req), req.params.id, req.body?.reason);
    auditLogService.record(req, { module: 'TRANSPORT', action: 'TRIP_ABORT', entityType: 'Trip', entityId: req.params.id, summary: 'Trip aborted' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function listTripStops(req, res, next) {
  try { ok(res, await transportTripService.stops(await ctx(req), req.params.id)); } catch (e) { next(e); }
}

export async function arriveStop(req, res, next) {
  try {
    ok(res, await transportTripService.arriveStop(await ctx(req), req.params.id, req.params.stopId, req.body || {}));
  } catch (e) { next(e); }
}

export async function departStop(req, res, next) {
  try {
    ok(res, await transportTripService.departStop(await ctx(req), req.params.id, req.params.stopId, req.body || {}));
  } catch (e) { next(e); }
}

/* --------------------------------- GPS --------------------------------- */
export async function postLocation(req, res, next) {
  try { ok(res, await transportLocationService.ingest(await ctx(req), req.params.id, req.body || {})); } catch (e) { next(e); }
}

export async function getLocation(req, res, next) {
  try { ok(res, await transportLocationService.latest(await ctx(req), req.params.id)); } catch (e) { next(e); }
}

export async function getLocationHistory(req, res, next) {
  try {
    const { data, pagination } = await transportLocationService.history(await ctx(req), req.params.id, req.query);
    ok(res, data, pagination);
  } catch (e) { next(e); }
}
