import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';
import { normalizeDate } from '../utils/transportTime.js';
import { transportRepository } from '../repositories/transport.repository.js';
import { RouteStop } from '../models/RouteStop.js';
import { StudentTransportAssignment } from '../models/StudentTransportAssignment.js';
import { TransportDailyStatus } from '../models/TransportDailyStatus.js';
import {
  buildRouteRun,
  markableDate,
  recordPickup,
  recordDrop,
  clearPickup,
  clearDrop,
} from './transportRun.service.js';

/**
 * The school-wide view of step 6 of the transport flow, for the Transport
 * Manager app (and, read-only, the school admin's "Daily Status" tab).
 *
 * Where a driver sees one route, the manager sees every route of the school:
 * the day's progress per route, any route's student list, and the fleet. The
 * only thing they write is the same thing a driver writes — a child's pickup /
 * drop for today or earlier — plus undoing a wrong tap. Vehicles, drivers,
 * routes, stops and student assignments stay with the school admin on the web.
 *
 * `schoolId` always comes from the verified JWT.
 */

function notFound(what) {
  return new AppError(`${what} not found`, 404, TRANSPORT_ERR.NOT_FOUND);
}

function requireId(value, label) {
  const raw = String(value ?? '').trim();
  if (!raw || !mongoose.isValidObjectId(raw)) {
    throw new AppError(`A valid ${label} id is required`, 400, TRANSPORT_ERR.VALIDATION_ERROR);
  }
  return raw;
}

const countBy = (rows, keyOf) =>
  rows.reduce((map, row) => {
    const key = String(keyOf(row));
    return map.set(key, (map.get(key) || 0) + 1);
  }, new Map());

class TransportManagerService {
  /** Every route with its bus, driver and the day's pickup / drop progress. */
  async overview(schoolId, query = {}) {
    const date = normalizeDate(query.date);

    const [routes, vehicles, drivers, assignments, statuses, stops] = await Promise.all([
      transportRepository.listRoutes(schoolId),
      transportRepository.listVehicles(schoolId),
      transportRepository.listDrivers(schoolId),
      StudentTransportAssignment.find({ schoolId, status: 'ACTIVE' }).select('studentId routeId').lean(),
      TransportDailyStatus.find({ schoolId, date }).select('studentId pickupStatus dropStatus').lean(),
      RouteStop.find({ schoolId }).select('routeId').lean(),
    ]);

    const statusBy = new Map(statuses.map((s) => [String(s.studentId), s]));
    const stopsByRoute = countBy(stops, (s) => s.routeId);
    const ridersByRoute = new Map();
    for (const a of assignments) {
      const key = String(a.routeId);
      const tally = ridersByRoute.get(key) || { total: 0, pickedUp: 0, dropped: 0 };
      // Only children who ride today count — a status left behind by a rider
      // who has since been taken off the route is not part of the day.
      const status = statusBy.get(String(a.studentId));
      tally.total += 1;
      if (status?.pickupStatus === 'PICKED_UP') tally.pickedUp += 1;
      if (status?.dropStatus === 'DROPPED') tally.dropped += 1;
      ridersByRoute.set(key, tally);
    }

    const routeCards = routes.map((route) => {
      const json = route.toPublicJSON();
      const tally = ridersByRoute.get(json.id) || { total: 0, pickedUp: 0, dropped: 0 };
      return {
        id: json.id,
        routeName: json.routeName,
        status: json.status,
        vehicle: json.vehicle,
        driver: json.driver,
        // Pickup / drop can be recorded only once a bus and a driver are on the route.
        ready: Boolean(json.vehicle && json.driver),
        totalStops: stopsByRoute.get(json.id) || 0,
        totalStudents: tally.total,
        pickedUpCount: tally.pickedUp,
        droppedCount: tally.dropped,
      };
    });

    const sum = (key) => routeCards.reduce((n, r) => n + r[key], 0);
    return {
      date,
      totals: {
        routes: routes.length,
        vehicles: vehicles.length,
        activeVehicles: vehicles.filter((v) => v.status === 'ACTIVE').length,
        drivers: drivers.length,
        activeDrivers: drivers.filter((d) => d.status === 'ACTIVE').length,
        students: sum('totalStudents'),
        pickedUp: sum('pickedUpCount'),
        dropped: sum('droppedCount'),
      },
      routes: routeCards,
    };
  }

  /** One route's day: its stops and every rider with their pickup / drop status. */
  async routeRun(schoolId, routeIdRaw, query = {}) {
    const routeId = requireId(routeIdRaw, 'route');
    const route = await transportRepository.getRoute(schoolId, routeId);
    if (!route) throw notFound('Route');

    const [run, stops] = await Promise.all([
      buildRouteRun(schoolId, route, normalizeDate(query.date)),
      transportRepository.listStops(schoolId, route._id),
    ]);
    const json = route.toPublicJSON();
    return {
      ...run,
      route: { ...run.route, status: json.status, vehicle: json.vehicle, driver: json.driver },
      ready: Boolean(json.vehicle && json.driver),
      stops: stops.map((s) => s.toPublicJSON()),
    };
  }

  /** The fleet, read-only: every vehicle and driver and the route each one serves. */
  async fleet(schoolId) {
    const [vehicles, drivers, routes] = await Promise.all([
      transportRepository.listVehicles(schoolId),
      transportRepository.listDrivers(schoolId),
      transportRepository.listRoutes(schoolId),
    ]);
    const routeOf = (field) =>
      new Map(
        routes
          .filter((r) => r[field])
          .map((r) => [String(r[field]._id || r[field]), { id: r._id.toString(), routeName: r.routeName }])
      );
    const routeByVehicle = routeOf('vehicleId');
    const routeByDriver = routeOf('driverId');
    const driverByVehicle = new Map(
      drivers.filter((d) => d.vehicleId).map((d) => [String(d.vehicleId._id || d.vehicleId), d])
    );

    return {
      vehicles: vehicles.map((v) => {
        const driver = driverByVehicle.get(String(v._id));
        return {
          ...v.toPublicJSON(),
          driver: driver ? { id: driver._id.toString(), name: driver.name, mobile: driver.mobile } : null,
          route: routeByVehicle.get(String(v._id)) || null,
        };
      }),
      drivers: drivers.map((d) => {
        const json = d.toPublicJSON();
        return {
          id: json.id,
          name: json.name,
          mobile: json.mobile,
          licenseNumber: json.licenseNumber,
          photo: json.photo,
          status: json.status,
          vehicle: json.vehicle,
          route: routeByDriver.get(json.id) || null,
        };
      }),
    };
  }

  /**
   * The ride a mark is recorded against: the student's ACTIVE assignment in
   * this school, and the driver of its route. Same 404 whether the student
   * does not exist, does not use transport, or belongs to another school.
   */
  async #ride(schoolId, studentIdRaw, date) {
    const studentId = requireId(studentIdRaw, 'student');
    const assignment = await transportRepository.findActiveAssignmentForStudent(schoolId, studentId);
    if (!assignment) throw notFound('Student on a transport route');

    const routeId = assignment.routeId?._id || assignment.routeId;
    const route = await transportRepository.getRoute(schoolId, routeId);
    if (!route) throw notFound('Route');
    // Same rule as `ready` on the overview and the route run, so the app never
    // offers a button the server then refuses.
    if (!route.vehicleId || !route.driverId) {
      throw new AppError(
        'This route needs a vehicle and a driver. Ask the school office to assign them before recording pickup or drop.',
        409,
        TRANSPORT_ERR.ROUTE_NOT_READY
      );
    }
    return {
      routeId: route._id,
      stopId: assignment.stopId?._id || assignment.stopId,
      driverId: route.driverId._id || route.driverId,
      studentId,
      date,
    };
  }

  async markPickup(schoolId, userId, studentId, body = {}) {
    const ride = await this.#ride(schoolId, studentId, markableDate(body.date));
    return recordPickup(schoolId, ride, { markedByUserId: userId });
  }

  async markDrop(schoolId, userId, studentId, body = {}) {
    const ride = await this.#ride(schoolId, studentId, markableDate(body.date));
    return recordDrop(schoolId, ride, { markedByUserId: userId });
  }

  async undoPickup(schoolId, userId, studentId, body = {}) {
    const ride = await this.#ride(schoolId, studentId, markableDate(body.date));
    return clearPickup(schoolId, ride, { markedByUserId: userId });
  }

  async undoDrop(schoolId, userId, studentId, body = {}) {
    const ride = await this.#ride(schoolId, studentId, markableDate(body.date));
    return clearDrop(schoolId, ride, { markedByUserId: userId });
  }
}

export const transportManagerService = new TransportManagerService();
