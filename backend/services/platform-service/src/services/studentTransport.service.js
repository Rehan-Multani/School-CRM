import mongoose from 'mongoose';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { transportRepository } from '../repositories/transport.repository.js';
import { TransportDailyStatus } from '../models/TransportDailyStatus.js';
import { todayStr } from '../utils/transportTime.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Read-only transport view for ONE rider — the Student APK (own id) and the
 * Parent APK (a child resolved through parentAccess.resolveChild). `ctx` is the
 * student-shaped context both access services return: `{ schoolId, studentId }`
 * from the verified JWT / link, never from the request.
 *
 * Writes (pickup / drop) stay with the driver API and the Transport Manager;
 * this module only reads what they recorded.
 */
class StudentTransportService {
  /** Route, bus, driver, the rider's stop, today's pickup/drop and the full stop list. */
  async overview(ctx) {
    const schoolId = oid(ctx.schoolId);
    const studentId = oid(ctx.studentId);
    const assignment = await transportRepository.findActiveAssignmentForStudent(schoolId, studentId);
    if (!assignment) return { assigned: false };

    const routeId = assignment.routeId?._id || assignment.routeId;
    const date = todayStr();
    const [route, stops, status] = await Promise.all([
      transportRepository.getRoute(schoolId, routeId),
      transportRepository.listStops(schoolId, routeId),
      transportRepository.findDailyStatus(schoolId, studentId, date),
    ]);
    // Route deleted under an assignment that was not discontinued — nothing to ride.
    if (!route) return { assigned: false };

    const routeJson = route.toPublicJSON();
    const myStopId = String(assignment.stopId?._id || assignment.stopId);
    const myStop = stops.find((s) => String(s._id) === myStopId) || assignment.stopId;

    return {
      assigned: true,
      route: {
        id: routeJson.id,
        name: routeJson.routeName,
        status: routeJson.status,
        vehicle: routeJson.vehicle
          ? {
              number: routeJson.vehicle.vehicleNumber,
              type: routeJson.vehicle.vehicleType,
              capacity: routeJson.vehicle.capacity,
            }
          : null,
        driver: routeJson.driver ? { name: routeJson.driver.name, mobile: routeJson.driver.mobile } : null,
      },
      stop: myStop?._id
        ? {
            id: String(myStop._id),
            name: myStop.stopName,
            pickupTime: myStop.pickupTime || '',
            dropTime: myStop.dropTime || '',
            sequenceOrder: myStop.sequenceOrder ?? null,
          }
        : null,
      today: {
        date,
        pickup: { done: status?.pickupStatus === 'PICKED_UP', at: status?.pickedUpAt || null },
        drop: { done: status?.dropStatus === 'DROPPED', at: status?.droppedAt || null },
      },
      stops: stops.map((s) => ({
        id: String(s._id),
        name: s.stopName,
        sequenceOrder: s.sequenceOrder,
        pickupTime: s.pickupTime,
        dropTime: s.dropTime,
        isMine: String(s._id) === myStopId,
      })),
    };
  }

  /** Daily pickup/drop rows for the rider, newest first. Optional from/to (YYYY-MM-DD) + page/limit. */
  async history(ctx, query = {}) {
    const filter = { schoolId: oid(ctx.schoolId), studentId: oid(ctx.studentId) };
    const from = DATE_RE.test(String(query.from || '')) ? String(query.from) : null;
    const to = DATE_RE.test(String(query.to || '')) ? String(query.to) : null;
    if (from || to) {
      filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
    }
    const { page, limit, skip } = sanitizePagination({
      page: query.page,
      limit: query.limit,
      defaultLimit: 30,
      maxLimit: 100,
    });
    const [rows, total] = await Promise.all([
      TransportDailyStatus.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      TransportDailyStatus.countDocuments(filter),
    ]);
    return {
      data: rows.map((r) => ({
        id: String(r._id),
        date: r.date,
        pickup: { done: r.pickupStatus === 'PICKED_UP', at: r.pickedUpAt || null },
        drop: { done: r.dropStatus === 'DROPPED', at: r.droppedAt || null },
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

export const studentTransportService = new StudentTransportService();
