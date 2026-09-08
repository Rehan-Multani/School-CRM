import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Trip } from '../models/Trip.js';
import { TransportIncident } from '../models/TransportIncident.js';
import { TransportSOS, ACTIVE_SOS_STATUSES } from '../models/TransportSOS.js';
import { Vehicle } from '../models/Vehicle.js';
import { transportAccessService } from './transportAccess.service.js';
import { transportAlertService } from './transportAlert.service.js';
import { transportNotifyService } from './transportNotify.service.js';
import { sosLite } from '../serializers/transport.serializers.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const ISSUE_TYPES = ['BREAKDOWN', 'FLAT_TYRE', 'ENGINE', 'BRAKE', 'GPS', 'DOOR', 'OTHER'];
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const SEVERITY_TO_PRIORITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' };

class TransportIncidentService {
  /* ------------------------------ vehicle issues ------------------------------ */
  async reportIssue(ctx, tripId, body = {}) {
    const trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    const type = String(body.type || 'OTHER').toUpperCase();
    if (!ISSUE_TYPES.includes(type)) {
      throw new AppError(`type must be one of ${ISSUE_TYPES.join(', ')}`, 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    const severity = String(body.severity || 'MEDIUM').toUpperCase();
    if (!SEVERITIES.includes(severity)) {
      throw new AppError(`severity must be one of ${SEVERITIES.join(', ')}`, 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    const description = String(body.description || '').trim();
    if (!description) throw new AppError('A description is required', 400, TRANSPORT_ERR.VALIDATION_ERROR);

    const incident = await TransportIncident.create({
      schoolId: trip.schoolId,
      routeId: trip.routeId,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId || null,
      incidentType: type === 'BREAKDOWN' || type === 'ENGINE' || type === 'BRAKE' || type === 'FLAT_TYRE' ? 'BREAKDOWN' : 'OTHER',
      incidentDate: new Date(),
      title: `Vehicle issue: ${type.replace('_', ' ').toLowerCase()}`,
      description: description.slice(0, 2000),
      priority: SEVERITY_TO_PRIORITY[severity],
      status: 'REPORTED',
    });

    const alert = await transportAlertService.raise({
      schoolId: ctx.schoolId,
      type: 'VEHICLE_ISSUE',
      severity,
      title: `Vehicle issue on ${trip.tripType.toLowerCase().replace('_', ' ')}`,
      body: description.slice(0, 500),
      tripId: trip._id,
      vehicleId: trip.vehicleId,
      routeId: trip.routeId,
      refType: 'TransportIncident',
      refId: String(incident._id),
      raisedBy: oid(ctx.staffId),
    });

    if (severity === 'CRITICAL' || severity === 'HIGH') {
      transportNotifyService.notifyTransportAndAdmin(ctx.schoolId, {
        title: `Critical vehicle issue`,
        body: `${type.replace('_', ' ')} reported on route ${trip.routeId}. ${description.slice(0, 120)}`,
      });
    }
    // NOTE: the trip is intentionally NOT auto-completed — a manager decides.
    return { incidentId: String(incident._id), alertId: String(alert._id) };
  }

  async listTripIssues(ctx, tripId, query = {}) {
    const trip = await transportAccessService.loadTrip(ctx, tripId);
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const filter = { schoolId: trip.schoolId, vehicleId: trip.vehicleId, incidentDate: { $exists: true } };
    const [rows, total] = await Promise.all([
      TransportIncident.find(filter).sort({ incidentDate: -1 }).skip(skip).limit(limit).lean(),
      TransportIncident.countDocuments(filter),
    ]);
    return {
      data: rows.map((i) => ({
        id: String(i._id),
        incidentType: i.incidentType,
        title: i.title,
        description: i.description,
        priority: i.priority,
        status: i.status,
        incidentDate: i.incidentDate,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /* --------------------------------- SOS --------------------------------- */
  async raiseSOS(ctx, body = {}) {
    const tripId = body.tripId && mongoose.isValidObjectId(String(body.tripId)) ? String(body.tripId) : null;
    let trip = null;
    if (tripId) {
      trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    }
    const lat = body.location?.lat ?? body.lat;
    const lng = body.location?.lng ?? body.lng;
    const location =
      lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
        ? { lat: Number(lat), lng: Number(lng) }
        : { lat: null, lng: null };

    // Code-level anti-duplicate (the partial-unique index is the race backstop).
    if (trip) {
      const open = await TransportSOS.findOne({ tripId: trip._id, isOpen: true }).select('_id').lean();
      if (open) throw new AppError('An SOS is already active for this trip', 409, TRANSPORT_ERR.SOS_ALREADY_ACTIVE);
    }

    let sos;
    try {
      sos = await TransportSOS.create({
        schoolId: oid(ctx.schoolId),
        tripId: trip ? trip._id : null,
        vehicleId: trip ? trip.vehicleId : ctx.assignedVehicleId ? oid(ctx.assignedVehicleId) : null,
        driverId: oid(ctx.staffId),
        location,
        description: String(body.description || '').slice(0, 1000),
        status: 'ACTIVE',
        raisedAt: new Date(),
      });
    } catch (err) {
      if (err?.code === 11000) {
        throw new AppError('An SOS is already active for this trip', 409, TRANSPORT_ERR.SOS_ALREADY_ACTIVE);
      }
      throw err;
    }

    await transportAlertService.raise({
      schoolId: ctx.schoolId,
      type: 'EMERGENCY',
      severity: 'CRITICAL',
      title: 'SOS — emergency raised',
      body: sos.description || 'A transport SOS was raised. Immediate attention required.',
      tripId: sos.tripId,
      vehicleId: sos.vehicleId,
      refType: 'TransportSOS',
      refId: String(sos._id),
      raisedBy: oid(ctx.staffId),
      audienceRoles: ctx.settings.sosRecipientRoles,
    });
    transportNotifyService.notifyTransportAndAdmin(ctx.schoolId, {
      title: '🚨 Transport SOS',
      body: 'A driver has raised an emergency SOS. Open the app for details.',
    });
    return sosLite(sos);
  }

  async listSOS(ctx, query = {}) {
    const filter = ctx.isManager ? { schoolId: oid(ctx.schoolId) } : { schoolId: oid(ctx.schoolId), driverId: oid(ctx.staffId) };
    if (query.status) filter.status = String(query.status).toUpperCase();
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      TransportSOS.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      TransportSOS.countDocuments(filter),
    ]);
    return { data: rows.map((r) => sosLite(r)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async getSOS(ctx, id) {
    const row = await TransportSOS.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id) });
    if (!row) throw new AppError('SOS not found', 404, TRANSPORT_ERR.NOT_FOUND);
    if (!ctx.isManager && String(row.driverId) !== ctx.staffId) {
      throw new AppError('You cannot view this SOS', 403, TRANSPORT_ERR.FORBIDDEN);
    }
    return sosLite(row);
  }

  async updateSOS(ctx, id, body = {}) {
    const action = String(body.action || '').toLowerCase();
    const row = await TransportSOS.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id) });
    if (!row) throw new AppError('SOS not found', 404, TRANSPORT_ERR.NOT_FOUND);
    const isRaiser = String(row.driverId) === ctx.staffId;

    if (action === 'acknowledge') {
      if (!ctx.isManager) throw new AppError('Only a manager can acknowledge an SOS', 403, TRANSPORT_ERR.FORBIDDEN);
      if (row.status !== 'ACTIVE') throw new AppError(`Cannot acknowledge a ${row.status} SOS`, 409, TRANSPORT_ERR.SOS_STATE_CONFLICT);
      row.status = 'ACKNOWLEDGED';
      row.acknowledgedBy = oid(ctx.staffId);
      row.acknowledgedAt = new Date();
    } else if (action === 'resolve') {
      if (!ctx.isManager) throw new AppError('Only a manager can resolve an SOS', 403, TRANSPORT_ERR.FORBIDDEN);
      if (!ACTIVE_SOS_STATUSES.includes(row.status)) throw new AppError(`Cannot resolve a ${row.status} SOS`, 409, TRANSPORT_ERR.SOS_STATE_CONFLICT);
      row.status = 'RESOLVED';
      row.resolvedBy = oid(ctx.staffId);
      row.resolvedAt = new Date();
      row.resolutionNote = String(body.note || '').slice(0, 1000);
    } else if (action === 'cancel') {
      if (!isRaiser && !ctx.isManager) throw new AppError('Only the raiser or a manager can cancel an SOS', 403, TRANSPORT_ERR.FORBIDDEN);
      if (row.status !== 'ACTIVE') throw new AppError('Only an ACTIVE SOS can be cancelled', 409, TRANSPORT_ERR.SOS_STATE_CONFLICT);
      row.status = 'CANCELLED';
      row.cancelledBy = oid(ctx.staffId);
      row.cancelledAt = new Date();
    } else {
      throw new AppError('action must be acknowledge | resolve | cancel', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    await row.save();
    return sosLite(row);
  }
}

export const transportIncidentService = new TransportIncidentService();
