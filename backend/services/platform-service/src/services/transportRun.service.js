import { AppError } from '../../../shared/AppError.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';
import { normalizeDate, todayStr } from '../utils/transportTime.js';
import { transportRepository } from '../repositories/transport.repository.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';

/**
 * Step 6 of the transport flow — one route's day: who rides, from which stop,
 * and where each child stands (picked up / dropped). Shared by the two callers
 * that may record it: the driver API (their own route only) and the Transport
 * Manager app (any route of the school). Each caller does its own authorization
 * and hands this module a route / assignment it has already proven is theirs.
 */

/** Pickup and drop can only be recorded for what has already happened. */
export function markableDate(value) {
  const date = normalizeDate(value);
  if (date > todayStr()) {
    throw new AppError('Cannot record pickup or drop for a future date', 400, TRANSPORT_ERR.VALIDATION_ERROR);
  }
  return date;
}

/**
 * The student list of a route for a date, ordered by stop sequence so it reads
 * in the order the bus actually meets them.
 */
export async function buildRouteRun(schoolId, route, date) {
  const [allAssignments, routeDoc] = await Promise.all([
    transportRepository.listAssignments(schoolId, { routeId: route._id, status: 'ACTIVE' }),
    transportRepository.getRoute(schoolId, route._id),
  ]);
  // An assignment whose student record is gone has nobody to pick up.
  const assignments = allAssignments.filter((a) => a.studentId?._id);
  const studentIds = assignments.map((a) => a.studentId._id);

  const statuses = studentIds.length
    ? await transportRepository.listDailyStatusForStudents(schoolId, studentIds, date)
    : [];
  const statusBy = new Map(statuses.map((s) => [String(s.studentId), s]));

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

/**
 * `ride` = { routeId, stopId, driverId, studentId, date } for a child the caller
 * has verified rides that route; `extra` rides along on the row (who marked it).
 */
export async function recordPickup(schoolId, ride, extra = {}) {
  const existing = await transportRepository.findDailyStatus(schoolId, ride.studentId, ride.date);
  if (existing?.pickupStatus === 'PICKED_UP') {
    return { data: existing.toPublicJSON(), idempotent: true };
  }
  const row = await transportRepository.upsertDailyStatus(schoolId, ride.studentId, ride.date, {
    pickupStatus: 'PICKED_UP',
    pickedUpAt: new Date(),
    routeId: ride.routeId,
    stopId: ride.stopId,
    driverId: ride.driverId,
    ...extra,
  });
  return { data: row.toPublicJSON(), idempotent: false };
}

export async function recordDrop(schoolId, ride, extra = {}) {
  const existing = await transportRepository.findDailyStatus(schoolId, ride.studentId, ride.date);
  if (existing?.dropStatus === 'DROPPED') {
    return { data: existing.toPublicJSON(), idempotent: true };
  }
  // A child who never boarded cannot be dropped — marking it would create a
  // record the morning leg contradicts.
  if (existing?.pickupStatus !== 'PICKED_UP') {
    throw new AppError('Mark this student as picked up before recording a drop', 409, TRANSPORT_ERR.NOT_PICKED_UP);
  }
  const row = await transportRepository.upsertDailyStatus(schoolId, ride.studentId, ride.date, {
    dropStatus: 'DROPPED',
    droppedAt: new Date(),
    routeId: ride.routeId,
    stopId: ride.stopId,
    driverId: ride.driverId,
    ...extra,
  });
  return { data: row.toPublicJSON(), idempotent: false };
}

/**
 * Corrections — a wrong tap put back to PENDING. Only the Transport Manager may
 * do this. A pickup cannot be undone while the drop still stands, for the same
 * reason a drop needs a pickup first.
 */
export async function clearPickup(schoolId, ride, extra = {}) {
  const existing = await transportRepository.findDailyStatus(schoolId, ride.studentId, ride.date);
  if (!existing || existing.pickupStatus !== 'PICKED_UP') {
    return { data: existing ? existing.toPublicJSON() : null, idempotent: true };
  }
  if (existing.dropStatus === 'DROPPED') {
    throw new AppError('Undo the drop before undoing the pickup', 409, TRANSPORT_ERR.ALREADY_DROPPED);
  }
  const row = await transportRepository.upsertDailyStatus(schoolId, ride.studentId, ride.date, {
    pickupStatus: 'PENDING',
    pickedUpAt: null,
    ...extra,
  });
  return { data: row.toPublicJSON(), idempotent: false };
}

export async function clearDrop(schoolId, ride, extra = {}) {
  const existing = await transportRepository.findDailyStatus(schoolId, ride.studentId, ride.date);
  if (!existing || existing.dropStatus !== 'DROPPED') {
    return { data: existing ? existing.toPublicJSON() : null, idempotent: true };
  }
  const row = await transportRepository.upsertDailyStatus(schoolId, ride.studentId, ride.date, {
    dropStatus: 'PENDING',
    droppedAt: null,
    ...extra,
  });
  return { data: row.toPublicJSON(), idempotent: false };
}
