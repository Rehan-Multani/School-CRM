import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';
import { normalizeDate } from '../utils/transportTime.js';
import { transportRepository } from '../repositories/transport.repository.js';
import { buildRouteRun, markableDate, recordPickup, recordDrop } from './transportRun.service.js';

/**
 * Step 6 of the transport flow — the driver's read-only view of their route and
 * the one thing they are allowed to write: today's pickup / drop status.
 *
 * `schoolId` and `driverId` always come from the verified JWT. A driver can only
 * ever reach the route assigned to them, and only students actively assigned to
 * that route. The day's list and the writes themselves live in
 * transportRun.service.js, shared with the Transport Manager app.
 */

function notFound(what) {
  return new AppError(`${what} not found`, 404, TRANSPORT_ERR.NOT_FOUND);
}

function requireStudentId(value) {
  const raw = String(value ?? '').trim();
  if (!raw || !mongoose.isValidObjectId(raw)) {
    throw new AppError('A valid student id is required', 400, TRANSPORT_ERR.VALIDATION_ERROR);
  }
  return raw;
}

class DriverTransportService {
  /** The driver's route, or a clear 409 when the admin has not assigned one. */
  async loadRoute(schoolId, driverId) {
    const route = await transportRepository.findRouteOfDriver(schoolId, driverId);
    if (!route) {
      throw new AppError(
        'No route has been assigned to you yet. Contact your school office.',
        409,
        TRANSPORT_ERR.ROUTE_NOT_READY
      );
    }
    return route;
  }

  async myRoute(schoolId, driverId) {
    const route = await this.loadRoute(schoolId, driverId);
    const [populated, stops, riders] = await Promise.all([
      transportRepository.getRoute(schoolId, route._id),
      transportRepository.listStops(schoolId, route._id),
      transportRepository.countActiveAssignments(schoolId, { routeId: route._id }),
    ]);
    return {
      ...populated.toPublicJSON(),
      totalStops: stops.length,
      assignedStudents: riders,
      stops: stops.map((s) => s.toPublicJSON()),
    };
  }

  /**
   * The driver's student list for a date: who rides, from which stop, at what
   * scheduled time, and where each one stands today. Ordered by stop sequence so
   * the list reads in the order the bus actually meets them.
   */
  async myStudents(schoolId, driverId, query = {}) {
    const route = await this.loadRoute(schoolId, driverId);
    return buildRouteRun(schoolId, route, normalizeDate(query.date));
  }

  /** Shared guard: the student must actively ride THIS driver's route. */
  async #assignmentOnMyRoute(schoolId, driverId, studentIdRaw) {
    const route = await this.loadRoute(schoolId, driverId);
    const studentId = requireStudentId(studentIdRaw);

    const assignment = await transportRepository.findActiveAssignmentForStudent(schoolId, studentId);
    if (!assignment || String(assignment.routeId?._id || assignment.routeId) !== String(route._id)) {
      // Same 404 whether the student does not exist, rides another route, or
      // belongs to another school — a driver learns nothing either way.
      throw notFound('Student on your route');
    }
    return { route, assignment, studentId };
  }

  async markPickup(schoolId, driverId, studentIdRaw, body = {}) {
    const { route, assignment, studentId } = await this.#assignmentOnMyRoute(schoolId, driverId, studentIdRaw);
    const stopId = assignment.stopId?._id || assignment.stopId;
    return recordPickup(schoolId, { routeId: route._id, stopId, driverId, studentId, date: markableDate(body.date) });
  }

  async markDrop(schoolId, driverId, studentIdRaw, body = {}) {
    const { route, assignment, studentId } = await this.#assignmentOnMyRoute(schoolId, driverId, studentIdRaw);
    const stopId = assignment.stopId?._id || assignment.stopId;
    return recordDrop(schoolId, { routeId: route._id, stopId, driverId, studentId, date: markableDate(body.date) });
  }
}

export const driverTransportService = new DriverTransportService();
