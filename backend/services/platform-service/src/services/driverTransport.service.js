import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';
import { normalizeDate, todayStr } from '../utils/transportTime.js';
import { transportRepository } from '../repositories/transport.repository.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';

/**
 * Step 6 of the transport flow — the driver's read-only view of their route and
 * the one thing they are allowed to write: today's pickup / drop status.
 *
 * `schoolId` and `driverId` always come from the verified JWT. A driver can only
 * ever reach the route assigned to them, and only students actively assigned to
 * that route.
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

/** A driver may only record what has already happened. */
function markableDate(value) {
  const date = normalizeDate(value);
  if (date > todayStr()) {
    throw new AppError('Cannot record pickup or drop for a future date', 400, TRANSPORT_ERR.VALIDATION_ERROR);
  }
  return date;
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
    const date = normalizeDate(query.date);

    const [assignments, statuses] = await Promise.all([
      transportRepository.listAssignments(schoolId, { routeId: route._id, status: 'ACTIVE' }),
      transportRepository.listDailyStatus(schoolId, route._id, date),
    ]);

    const statusBy = new Map(statuses.map((s) => [String(s.studentId), s]));
    const studentIds = assignments.map((a) => a.studentId?._id).filter(Boolean);

    // Class/section and roll number come from the ACTIVE enrollment, batched.
    const enrolments = studentIds.length
      ? await StudentEnrollment.find({ schoolId, studentId: { $in: studentIds }, status: 'ACTIVE' })
          .select('studentId classId sectionId rollNumber')
          .lean()
      : [];
    const [classes, sections] = await Promise.all([
      SchoolClass.find({ _id: { $in: enrolments.map((e) => e.classId) } }).select('name').lean(),
      Section.find({ _id: { $in: enrolments.map((e) => e.sectionId) } }).select('name').lean(),
    ]);
    const classNames = new Map(classes.map((c) => [String(c._id), c.name]));
    const sectionNames = new Map(sections.map((s) => [String(s._id), s.name]));
    const metaBy = new Map(
      enrolments.map((e) => [
        String(e.studentId),
        {
          rollNumber: e.rollNumber || '',
          className: [classNames.get(String(e.classId)), sectionNames.get(String(e.sectionId))]
            .filter(Boolean)
            .join('-'),
        },
      ])
    );

    const students = assignments
      .map((assignment) => {
        const student = assignment.studentId;
        const stop = assignment.stopId;
        const meta = metaBy.get(String(student?._id)) || {};
        const today = statusBy.get(String(student?._id));
        return {
          studentId: String(student?._id || ''),
          name: [student?.firstName, student?.lastName].filter(Boolean).join(' ').trim(),
          admissionNumber: student?.admissionNumber || '',
          rollNumber: meta.rollNumber || '',
          className: meta.className || '',
          stop: stop?._id
            ? { id: String(stop._id), stopName: stop.stopName, sequenceOrder: stop.sequenceOrder }
            : null,
          pickupTime: stop?.pickupTime || '',
          dropTime: stop?.dropTime || '',
          pickupStatus: today?.pickupStatus || 'PENDING',
          pickedUpAt: today?.pickedUpAt || null,
          dropStatus: today?.dropStatus || 'PENDING',
          droppedAt: today?.droppedAt || null,
        };
      })
      .sort((a, b) => {
        const bySequence = (a.stop?.sequenceOrder || 0) - (b.stop?.sequenceOrder || 0);
        return bySequence !== 0 ? bySequence : a.name.localeCompare(b.name);
      });

    const routeDoc = await transportRepository.getRoute(schoolId, route._id);
    return {
      date,
      route: {
        id: route._id.toString(),
        routeName: route.routeName,
        vehicleNumber: routeDoc?.vehicleId?.vehicleNumber || '',
        driverName: routeDoc?.driverId?.name || '',
      },
      totalStudents: students.length,
      pickedUpCount: students.filter((s) => s.pickupStatus === 'PICKED_UP').length,
      droppedCount: students.filter((s) => s.dropStatus === 'DROPPED').length,
      students,
    };
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
    const date = markableDate(body.date);

    const existing = await transportRepository.findDailyStatus(schoolId, studentId, date);
    if (existing?.pickupStatus === 'PICKED_UP') {
      return { data: existing.toPublicJSON(), idempotent: true };
    }

    const stopId = assignment.stopId?._id || assignment.stopId;
    const row = await transportRepository.upsertDailyStatus(
      schoolId,
      studentId,
      date,
      { pickupStatus: 'PICKED_UP', pickedUpAt: new Date(), routeId: route._id, stopId, driverId }
    );
    return { data: row.toPublicJSON(), idempotent: false };
  }

  async markDrop(schoolId, driverId, studentIdRaw, body = {}) {
    const { route, assignment, studentId } = await this.#assignmentOnMyRoute(schoolId, driverId, studentIdRaw);
    const date = markableDate(body.date);

    const existing = await transportRepository.findDailyStatus(schoolId, studentId, date);
    if (existing?.dropStatus === 'DROPPED') {
      return { data: existing.toPublicJSON(), idempotent: true };
    }
    // A child who never boarded cannot be dropped — marking it would create a
    // record the morning leg contradicts.
    if (existing?.pickupStatus !== 'PICKED_UP') {
      throw new AppError(
        'Mark this student as picked up before recording a drop',
        409,
        TRANSPORT_ERR.NOT_PICKED_UP
      );
    }

    const stopId = assignment.stopId?._id || assignment.stopId;
    const row = await transportRepository.upsertDailyStatus(
      schoolId,
      studentId,
      date,
      { dropStatus: 'DROPPED', droppedAt: new Date(), routeId: route._id, stopId, driverId }
    );
    return { data: row.toPublicJSON(), idempotent: false };
  }
}

export const driverTransportService = new DriverTransportService();
