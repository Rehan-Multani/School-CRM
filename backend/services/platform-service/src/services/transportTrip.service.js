import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Trip, canTransition, TRIP_TYPES, TERMINAL_TRIP_STATUSES } from '../models/Trip.js';
import { TripStudent } from '../models/TripStudent.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { RouteStop } from '../models/RouteStop.js';
import { StudentTransportAssignment } from '../models/StudentTransportAssignment.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { VehicleInspection, INSPECTION_CHECKLIST, CRITICAL_ITEM_KEYS } from '../models/VehicleInspection.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { tripLite, tripStudentLite, vehicleLite, routeLite, inspectionLite } from '../serializers/transport.serializers.js';
import { transportAccessService } from './transportAccess.service.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const todayStr = () => new Date().toISOString().slice(0, 10);

function assertTransition(trip, to) {
  if (trip.status === to) return; // idempotent no-op handled by callers
  if (!canTransition(trip.status, to)) {
    throw new AppError(
      `A trip in "${trip.status}" cannot move to "${to}"`,
      409,
      TRANSPORT_ERR.INVALID_TRIP_TRANSITION
    );
  }
}

class TransportTripService {
  #listFilter(ctx) {
    if (ctx.isManager) return { schoolId: oid(ctx.schoolId) };
    return {
      schoolId: oid(ctx.schoolId),
      $or: [{ driverId: oid(ctx.staffId) }, { conductorId: oid(ctx.staffId) }],
    };
  }

  async list(ctx, query = {}) {
    const filter = this.#listFilter(ctx);
    if (query.status) filter.status = String(query.status).toUpperCase();
    if (query.type) filter.tripType = String(query.type).toUpperCase();
    if (query.date) filter.date = String(query.date);
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      Trip.find(filter).sort({ date: -1, scheduledStart: 1, createdAt: -1 }).skip(skip).limit(limit),
      Trip.countDocuments(filter),
    ]);
    return {
      data: rows.map((r) => tripLite(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async history(ctx, query = {}) {
    const filter = { ...this.#listFilter(ctx), status: { $in: TERMINAL_TRIP_STATUSES } };
    if (query.from) filter.date = { ...(filter.date || {}), $gte: String(query.from) };
    if (query.to) filter.date = { ...(filter.date || {}), $lte: String(query.to) };
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      Trip.find(filter).sort({ date: -1, actualEnd: -1 }).skip(skip).limit(limit),
      Trip.countDocuments(filter),
    ]);
    return { data: rows.map((r) => tripLite(r)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async detail(ctx, tripId) {
    const trip = await transportAccessService.loadTrip(ctx, tripId);
    const [route, vehicle, driver, conductor, students, inspection] = await Promise.all([
      TransportRoute.findById(trip.routeId).lean(),
      Vehicle.findById(trip.vehicleId).lean(),
      trip.driverId ? SchoolUser.findById(trip.driverId).select('name phone').lean() : null,
      trip.conductorId ? SchoolUser.findById(trip.conductorId).select('name phone').lean() : null,
      TripStudent.find({ tripId: trip._id }).sort({ createdAt: 1 }).lean(),
      trip.inspectionId ? VehicleInspection.findById(trip.inspectionId).lean() : null,
    ]);
    const stops = route
      ? await RouteStop.find({ schoolId: trip.schoolId, routeId: trip.routeId }).sort({ sequenceOrder: 1 }).lean()
      : [];
    return {
      ...tripLite(trip),
      route: route ? routeLite(route, stops) : null,
      vehicle: vehicle ? { ...vehicleLite(vehicle), status: vehicle.status } : null,
      driver: driver ? { id: String(driver._id), name: driver.name, phone: driver.phone || '' } : null,
      conductor: conductor ? { id: String(conductor._id), name: conductor.name, phone: conductor.phone || '' } : null,
      stopProgress: trip.stops || [],
      students: students.map((s) => tripStudentLite(s)),
      studentSummary: {
        total: students.length,
        boarded: students.filter((s) => s.status === 'BOARDED' || s.status === 'DROPPED').length,
        dropped: students.filter((s) => s.status === 'DROPPED').length,
        absent: students.filter((s) => s.status === 'ABSENT').length,
        pending: students.filter((s) => s.status === 'NOT_BOARDED').length,
      },
      inspection: inspection ? inspectionLite(inspection) : null,
      gps: {
        enabled: ctx.settings.gpsEnabled,
        lastAt: trip.lastLocation?.at || null,
        staleSeconds: trip.lastLocation?.at ? Math.round((Date.now() - new Date(trip.lastLocation.at).getTime()) / 1000) : null,
      },
    };
  }

  /* ------------------------------- create ------------------------------- */
  async create(ctx, body = {}, idempotencyKey = null) {
    transportAccessService.requireManager(ctx);
    const tripType = String(body.tripType || '').toUpperCase();
    if (!TRIP_TYPES.includes(tripType)) {
      throw new AppError(`tripType must be one of ${TRIP_TYPES.join(', ')}`, 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    const date = String(body.date || todayStr());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new AppError('date must be YYYY-MM-DD', 400, TRANSPORT_ERR.VALIDATION_ERROR);

    const route = await TransportRoute.findOne({ _id: oid(body.routeId), schoolId: oid(ctx.schoolId) });
    if (!route) throw new AppError('Route not found in this school', 404, TRANSPORT_ERR.NOT_FOUND);

    const vehicleId = body.vehicleId || route.vehicleId;
    if (!vehicleId) throw new AppError('No vehicle on the route — supply vehicleId', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    const vehicle = await Vehicle.findOne({ _id: oid(vehicleId), schoolId: oid(ctx.schoolId) });
    if (!vehicle) throw new AppError('Vehicle not found in this school', 404, TRANSPORT_ERR.NOT_FOUND);
    if (vehicle.status !== 'ACTIVE') {
      throw new AppError(`Vehicle is ${vehicle.status} and cannot run a trip`, 409, TRANSPORT_ERR.VEHICLE_NOT_AVAILABLE);
    }

    const driverId = body.driverId || route.driverId || null;
    const conductorId = body.conductorId || route.conductorId || null;

    // conflict: same vehicle OR driver already on a non-terminal trip that day
    const conflict = await Trip.findOne({
      schoolId: oid(ctx.schoolId),
      date,
      status: { $nin: TERMINAL_TRIP_STATUSES },
      $or: [{ vehicleId: oid(vehicleId) }, ...(driverId ? [{ driverId: oid(driverId) }] : [])],
    }).lean();
    if (conflict) {
      throw new AppError('That vehicle or driver already has an active trip for this date', 409, TRANSPORT_ERR.DUPLICATE_TRIP);
    }

    const stops = await RouteStop.find({ schoolId: oid(ctx.schoolId), routeId: route._id }).sort({ sequenceOrder: 1 }).lean();
    const assignments = await StudentTransportAssignment.find({
      schoolId: oid(ctx.schoolId),
      routeId: route._id,
      status: 'ACTIVE',
    }).lean();

    let trip;
    try {
      trip = await Trip.create({
        schoolId: oid(ctx.schoolId),
        routeId: route._id,
        vehicleId: vehicle._id,
        driverId: driverId ? oid(driverId) : null,
        conductorId: conductorId ? oid(conductorId) : null,
        tripType,
        date,
        scheduledStart: body.scheduledStart ? new Date(body.scheduledStart) : null,
        scheduledEnd: body.scheduledEnd ? new Date(body.scheduledEnd) : null,
        status: 'SCHEDULED',
        counts: { studentsExpected: assignments.length, boarded: 0, dropped: 0, absent: 0 },
        stops: stops.map((s) => ({
          stopId: s._id,
          stopName: s.stopName,
          sequenceOrder: s.sequenceOrder,
          lat: s.latitude ?? null,
          lng: s.longitude ?? null,
          studentsExpected: assignments.filter((a) => String(a.pickupStopId) === String(s._id)).length,
        })),
        createdBy: ctx.isSchoolAdmin ? null : oid(ctx.staffId),
        idempotencyKey: idempotencyKey || null,
      });
    } catch (err) {
      if (err?.code === 11000) {
        throw new AppError('A trip for this route/date/type already exists', 409, TRANSPORT_ERR.DUPLICATE_TRIP);
      }
      throw err;
    }

    if (assignments.length) {
      const studentIds = assignments.map((a) => a.studentId);
      const [students, enrolments] = await Promise.all([
        Student.find({ _id: { $in: studentIds } }).select('firstName lastName').lean(),
        StudentEnrollment.find({ schoolId: oid(ctx.schoolId), studentId: { $in: studentIds }, status: 'ACTIVE' }).select('studentId rollNumber').lean(),
      ]);
      const nameById = new Map(students.map((s) => [String(s._id), [s.firstName, s.lastName].filter(Boolean).join(' ').trim()]));
      const rollById = new Map(enrolments.map((e) => [String(e.studentId), e.rollNumber || '']));
      await TripStudent.insertMany(
        assignments.map((a) => ({
          schoolId: oid(ctx.schoolId),
          tripId: trip._id,
          studentId: a.studentId,
          studentName: nameById.get(String(a.studentId)) || '',
          rollNumber: rollById.get(String(a.studentId)) || '',
          routeId: route._id,
          pickupStopId: a.pickupStopId,
          dropStopId: a.dropStopId,
          status: 'NOT_BOARDED',
        })),
        { ordered: false }
      ).catch(() => {});
    }

    return tripLite(trip);
  }

  /* ----------------------------- inspection ---------------------------- */
  async submitInspection(ctx, tripId, body = {}) {
    const trip = await transportAccessService.loadTrip(ctx, tripId);
    if (TERMINAL_TRIP_STATUSES.includes(trip.status)) {
      throw new AppError('This trip is already closed', 409, TRANSPORT_ERR.INVALID_TRIP_TRANSITION);
    }
    const incoming = Array.isArray(body.items) ? body.items : [];
    const byKey = new Map(incoming.map((i) => [String(i.key), i]));
    const items = INSPECTION_CHECKLIST.map((def) => {
      const got = byKey.get(def.key) || {};
      const result = ['PASS', 'FAIL', 'NOT_APPLICABLE'].includes(String(got.result || '').toUpperCase())
        ? String(got.result).toUpperCase()
        : 'PASS';
      return { key: def.key, label: def.label, critical: def.critical, result, remarks: String(got.remarks || '').slice(0, 300) };
    });
    const criticalFailed = items.some((i) => i.critical && i.result === 'FAIL');
    const anyFailed = items.some((i) => i.result === 'FAIL');
    const overallResult = anyFailed ? 'FAIL' : 'PASS';

    const wantsOverride = Boolean(body.override) && criticalFailed;
    if (criticalFailed && !wantsOverride && ctx.settings.criticalInspectionBlocksTrip) {
      // still record the inspection, but the trip stays un-startable
    }
    if (wantsOverride && !ctx.isManager) {
      throw new AppError('Only a transport manager can override a critical inspection failure', 403, TRANSPORT_ERR.TRANSPORT_ROLE_REQUIRED);
    }

    const inspection = await VehicleInspection.create({
      schoolId: trip.schoolId,
      vehicleId: trip.vehicleId,
      tripId: trip._id,
      inspectedBy: ctx.isSchoolAdmin ? null : oid(ctx.staffId),
      inspectedAt: new Date(),
      items,
      photos: Array.isArray(body.photos) ? body.photos.slice(0, 6) : [],
      remarks: String(body.remarks || '').slice(0, 500),
      criticalFailed,
      overallResult,
      overridden: wantsOverride,
      overrideBy: wantsOverride ? oid(ctx.staffId) : null,
      overrideReason: wantsOverride ? String(body.overrideReason || '').slice(0, 500) : '',
    });

    const passed = overallResult === 'PASS' || wantsOverride;
    trip.inspectionId = inspection._id;
    trip.inspectionPassed = passed;
    if (passed && ['SCHEDULED', 'INSPECTION_PENDING'].includes(trip.status)) trip.status = 'READY';
    else if (!passed && trip.status === 'SCHEDULED') trip.status = 'INSPECTION_PENDING';
    await trip.save();

    return { inspection: inspectionLite(inspection), trip: tripLite(trip), passed };
  }

  async getInspection(ctx, tripId) {
    const trip = await transportAccessService.loadTrip(ctx, tripId);
    const inspection = await VehicleInspection.findOne({ schoolId: trip.schoolId, tripId: trip._id }).sort({ inspectedAt: -1 });
    return inspection ? inspectionLite(inspection) : null;
  }

  /* ------------------------------ lifecycle --------------------------- */
  async start(ctx, tripId) {
    const trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    if (trip.status === 'STARTED' || trip.status === 'IN_PROGRESS') {
      return tripLite(trip); // idempotent
    }
    if (!ctx.isManager && trip.driverId && String(trip.driverId) !== ctx.staffId) {
      throw new AppError('Only the assigned driver can start this trip', 403, TRANSPORT_ERR.TRIP_ACCESS_DENIED);
    }
    assertTransition(trip, 'STARTED');
    if (trip.date !== todayStr()) {
      throw new AppError('A trip can only be started on its scheduled date', 409, TRANSPORT_ERR.TRIP_DATE_INVALID);
    }
    const vehicle = await Vehicle.findById(trip.vehicleId).select('status').lean();
    if (!vehicle || vehicle.status !== 'ACTIVE') {
      throw new AppError('The vehicle is not available (blocked / maintenance)', 409, TRANSPORT_ERR.VEHICLE_NOT_AVAILABLE);
    }
    if (ctx.settings.inspectionRequired && !trip.inspectionPassed) {
      throw new AppError('A passed pre-trip inspection is required before starting', 409, TRANSPORT_ERR.INSPECTION_REQUIRED);
    }
    trip.status = 'STARTED';
    trip.actualStart = new Date();
    trip.startedBy = ctx.isSchoolAdmin ? null : oid(ctx.staffId);
    await trip.save();
    return tripLite(trip);
  }

  async complete(ctx, tripId) {
    const trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    if (trip.status === 'COMPLETED') return tripLite(trip);
    assertTransition(trip, 'COMPLETED');
    trip.status = 'COMPLETED';
    trip.actualEnd = new Date();
    trip.completedBy = ctx.isSchoolAdmin ? null : oid(ctx.staffId);
    await trip.save();
    return tripLite(trip);
  }

  async cancel(ctx, tripId, reason = '') {
    transportAccessService.requireManager(ctx);
    const trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    if (trip.status === 'CANCELLED') return tripLite(trip);
    assertTransition(trip, 'CANCELLED');
    trip.status = 'CANCELLED';
    trip.cancelledBy = ctx.isSchoolAdmin ? null : oid(ctx.staffId);
    trip.abortReason = String(reason || '').slice(0, 500);
    await trip.save();
    return tripLite(trip);
  }

  async abort(ctx, tripId, reason = '') {
    const trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    if (trip.status === 'ABORTED') return tripLite(trip);
    if (!ctx.isManager && trip.driverId && String(trip.driverId) !== ctx.staffId) {
      throw new AppError('Only the assigned driver can abort this trip', 403, TRANSPORT_ERR.TRIP_ACCESS_DENIED);
    }
    assertTransition(trip, 'ABORTED');
    if (!String(reason || '').trim()) {
      throw new AppError('An abort reason is required', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    trip.status = 'ABORTED';
    trip.actualEnd = new Date();
    trip.abortReason = String(reason).slice(0, 500);
    await trip.save();
    return tripLite(trip);
  }

  /* -------------------------------- stops ---------------------------- */
  async stops(ctx, tripId) {
    const trip = await transportAccessService.loadTrip(ctx, tripId);
    return trip.stops || [];
  }

  async #stopEvent(ctx, tripId, stopId, kind, gps) {
    const trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    if (!['STARTED', 'IN_PROGRESS'].includes(trip.status)) {
      throw new AppError('The trip is not active', 409, TRANSPORT_ERR.TRIP_NOT_ACTIVE);
    }
    const idx = (trip.stops || []).findIndex((s) => String(s.stopId) === String(stopId));
    if (idx === -1) throw new AppError('Stop not on this trip', 404, TRANSPORT_ERR.NOT_FOUND);
    const now = new Date();
    if (kind === 'arrive') {
      trip.stops[idx].arrivedAt = trip.stops[idx].arrivedAt || now;
      trip.currentStopId = trip.stops[idx].stopId;
      if (trip.stops[idx].expectedAt) {
        trip.stops[idx].delayMin = Math.max(0, Math.round((now - new Date(trip.stops[idx].expectedAt)) / 60000));
      }
      if (trip.status === 'STARTED') trip.status = 'IN_PROGRESS';
    } else {
      trip.stops[idx].departedAt = trip.stops[idx].departedAt || now;
    }
    if (gps && gps.lat != null && gps.lng != null) {
      trip.lastLocation = { lat: gps.lat, lng: gps.lng, speed: null, heading: null, accuracy: gps.accuracy ?? null, at: now };
    }
    trip.markModified('stops');
    await trip.save();
    return tripLite(trip);
  }

  arriveStop(ctx, tripId, stopId, gps) {
    return this.#stopEvent(ctx, tripId, stopId, 'arrive', gps);
  }

  departStop(ctx, tripId, stopId, gps) {
    return this.#stopEvent(ctx, tripId, stopId, 'depart', gps);
  }
}

export const transportTripService = new TransportTripService();
export { assertTransition };
