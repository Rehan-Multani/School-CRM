import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { Trip } from '../models/Trip.js';
import { TripStudent } from '../models/TripStudent.js';
import { TransportSettings } from '../models/TransportSettings.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';
import { schoolId as tenantSchoolId, transportStaffId as tenantStaffId } from '../utils/tenant.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const MANAGER_ROLES = new Set(['TRANSPORT_MANAGER', 'TRANSPORT_ADMIN']);

/**
 * Authorization core for every Transport APK endpoint.
 *
 * Identity (`schoolId`, `staffId`) is always taken from the verified JWT.
 * A driver / conductor may only touch trips they are assigned to (or their
 * assigned vehicle/route); a manager/admin (or SCHOOLADMIN) sees the whole
 * school. `loadContext` does one batched load, cached on the request.
 */
class TransportAccessService {
  async buildContext(schoolId, staffId, jwtRole) {
    const isSchoolAdmin = String(jwtRole || '').toUpperCase() === 'SCHOOLADMIN';
    let staff = null;
    if (!isSchoolAdmin) {
      staff = await SchoolUser.findOne({ _id: staffId, schoolId: oid(schoolId), role: 'TRANSPORT' }).lean();
      if (!staff) throw new AppError('Transport staff not found', 404, TRANSPORT_ERR.STAFF_NOT_FOUND);
      if (staff.status && staff.status !== 'ACTIVE') {
        throw new AppError('This transport account is not active', 403, TRANSPORT_ERR.STAFF_INACTIVE);
      }
    }

    const transportRole = (staff?.transportRole || (isSchoolAdmin ? 'TRANSPORT_ADMIN' : '')).toUpperCase();
    const settings = await TransportSettings.getOrDefault(oid(schoolId));

    return {
      schoolId: String(schoolId),
      staffId: String(staffId),
      staff,
      isSchoolAdmin,
      transportRole,
      isManager: isSchoolAdmin || MANAGER_ROLES.has(transportRole),
      assignedVehicleId: staff?.assignedVehicleId ? String(staff.assignedVehicleId) : null,
      assignedRouteId: staff?.assignedRouteId ? String(staff.assignedRouteId) : null,
      settings,
    };
  }

  async loadContext(req) {
    if (!req._transportCtx) {
      req._transportCtx = await this.buildContext(tenantSchoolId(req), tenantStaffId(req), req.user?.role);
    }
    return req._transportCtx;
  }

  requireManager(ctx) {
    if (!ctx.isManager) {
      throw new AppError('This action requires a transport manager or admin role', 403, TRANSPORT_ERR.TRANSPORT_ROLE_REQUIRED);
    }
    return ctx;
  }

  /** Load a trip and assert the staff may act on it. Cross-school/unknown → 404. */
  async loadTrip(ctx, tripId, { forWrite = false } = {}) {
    if (!tripId || !mongoose.isValidObjectId(String(tripId))) {
      throw new AppError('Invalid trip id', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    const trip = await Trip.findOne({ _id: oid(tripId), schoolId: oid(ctx.schoolId) });
    if (!trip) throw new AppError('Trip not found', 404, TRANSPORT_ERR.NOT_FOUND);
    if (!ctx.isManager) {
      const mine =
        (trip.driverId && String(trip.driverId) === ctx.staffId) ||
        (trip.conductorId && String(trip.conductorId) === ctx.staffId);
      if (!mine) {
        throw new AppError('You are not assigned to this trip', 403, TRANSPORT_ERR.TRIP_ACCESS_DENIED);
      }
    }
    if (forWrite && !ctx.isManager) {
      // a conductor can board/drop; only the driver can start/complete/abort/location.
      // The per-service checks narrow further; this just blocks a totally unrelated staff.
    }
    return trip;
  }

  /** Manager: any vehicle in school. Driver/conductor: only the assigned one. */
  assertVehicle(ctx, vehicleId) {
    if (ctx.isManager) return String(vehicleId);
    if (!vehicleId || String(vehicleId) !== ctx.assignedVehicleId) {
      throw new AppError('You are not assigned to this vehicle', 403, TRANSPORT_ERR.VEHICLE_ACCESS_DENIED);
    }
    return String(vehicleId);
  }

  assertRoute(ctx, routeId) {
    if (ctx.isManager) return String(routeId);
    if (!routeId || String(routeId) !== ctx.assignedRouteId) {
      throw new AppError('You are not assigned to this route', 403, TRANSPORT_ERR.ROUTE_ACCESS_DENIED);
    }
    return String(routeId);
  }

  async assertStudentOnTrip(tripId, studentId) {
    if (!studentId || !mongoose.isValidObjectId(String(studentId))) {
      throw new AppError('Invalid student id', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    const row = await TripStudent.findOne({ tripId: oid(tripId), studentId: oid(studentId) });
    if (!row) throw new AppError('This student is not on this trip', 403, TRANSPORT_ERR.STUDENT_NOT_ON_TRIP);
    return row;
  }
}

export const transportAccessService = new TransportAccessService();
