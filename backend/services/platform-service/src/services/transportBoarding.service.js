import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Trip } from '../models/Trip.js';
import { TripStudent } from '../models/TripStudent.js';
import { TransportIncident } from '../models/TransportIncident.js';
import { tripStudentLite } from '../serializers/transport.serializers.js';
import { transportAccessService } from './transportAccess.service.js';
import { transportAlertService } from './transportAlert.service.js';
import { transportNotifyService } from './transportNotify.service.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

async function recomputeCounts(trip) {
  const rows = await TripStudent.find({ tripId: trip._id }).select('status').lean();
  trip.counts = {
    studentsExpected: rows.length,
    boarded: rows.filter((r) => r.status === 'BOARDED' || r.status === 'DROPPED').length,
    dropped: rows.filter((r) => r.status === 'DROPPED').length,
    absent: rows.filter((r) => r.status === 'ABSENT').length,
  };
  await trip.save();
}

class TransportBoardingService {
  async listStudents(ctx, tripId, query = {}) {
    await transportAccessService.loadTrip(ctx, tripId);
    const filter = { schoolId: oid(ctx.schoolId), tripId: oid(tripId) };
    if (query.status) filter.status = String(query.status).toUpperCase();
    if (query.stopId && mongoose.isValidObjectId(String(query.stopId))) filter.pickupStopId = oid(query.stopId);
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 50, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      TripStudent.find(filter).sort({ pickupStopId: 1, studentName: 1 }).skip(skip).limit(limit),
      TripStudent.countDocuments(filter),
    ]);
    return {
      data: rows.map((r) => tripStudentLite(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async studentStatus(ctx, tripId, studentId) {
    await transportAccessService.loadTrip(ctx, tripId);
    const row = await transportAccessService.assertStudentOnTrip(tripId, studentId);
    return tripStudentLite(row);
  }

  async #mutate(ctx, tripId, studentId, next) {
    const trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    if (!['STARTED', 'IN_PROGRESS'].includes(trip.status)) {
      throw new AppError('The trip is not active', 409, TRANSPORT_ERR.TRIP_NOT_ACTIVE);
    }
    const row = await transportAccessService.assertStudentOnTrip(tripId, studentId);
    return { trip, row };
  }

  async board(ctx, tripId, studentId, body = {}) {
    const { trip, row } = await this.#mutate(ctx, tripId, studentId, 'BOARDED');
    if (row.status === 'BOARDED' || row.status === 'DROPPED') {
      return { data: tripStudentLite(row), idempotent: true };
    }
    if (row.status === 'CANCELLED') {
      throw new AppError('This student was cancelled for the trip', 409, TRANSPORT_ERR.BOARDING_STATE_CONFLICT);
    }
    row.status = 'BOARDED';
    row.boardedAt = new Date();
    row.boardStopId = body.stopId && mongoose.isValidObjectId(String(body.stopId)) ? oid(body.stopId) : row.pickupStopId;
    if (body.lat != null && body.lng != null) row.boardGps = { lat: Number(body.lat), lng: Number(body.lng) };
    row.operatorId = oid(ctx.staffId);
    row.absentAt = null;
    row.absentReason = '';
    await row.save();
    await recomputeCounts(trip);

    if (ctx.settings.boardingNotify) {
      transportNotifyService.notifyParent(ctx.schoolId, studentId, {
        title: 'Boarded the bus',
        body: `${row.studentName || 'Your child'} boarded the school bus.`,
      });
    }
    return { data: tripStudentLite(row), idempotent: false };
  }

  async drop(ctx, tripId, studentId, body = {}) {
    const { trip, row } = await this.#mutate(ctx, tripId, studentId, 'DROPPED');
    if (row.status === 'DROPPED') return { data: tripStudentLite(row), idempotent: true };
    if (row.status !== 'BOARDED') {
      throw new AppError('The student has not been boarded on this trip', 409, TRANSPORT_ERR.NOT_BOARDED);
    }
    row.status = 'DROPPED';
    row.droppedAt = new Date();
    row.dropStopId2 = body.stopId && mongoose.isValidObjectId(String(body.stopId)) ? oid(body.stopId) : row.dropStopId;
    if (body.lat != null && body.lng != null) row.dropGps = { lat: Number(body.lat), lng: Number(body.lng) };
    row.operatorId = oid(ctx.staffId);
    await row.save();
    await recomputeCounts(trip);

    if (ctx.settings.dropNotify) {
      transportNotifyService.notifyParent(ctx.schoolId, studentId, {
        title: 'Dropped off',
        body: `${row.studentName || 'Your child'} was dropped off at their stop.`,
      });
    }
    return { data: tripStudentLite(row), idempotent: false };
  }

  async absent(ctx, tripId, studentId, body = {}) {
    const { trip, row } = await this.#mutate(ctx, tripId, studentId, 'ABSENT');
    if (row.status === 'ABSENT') return { data: tripStudentLite(row), idempotent: true };
    if (row.status === 'DROPPED') {
      throw new AppError('The student was already dropped — cannot mark absent', 409, TRANSPORT_ERR.BOARDING_STATE_CONFLICT);
    }
    row.status = 'ABSENT';
    row.absentAt = new Date();
    row.absentReason = String(body.reason || '').slice(0, 300);
    row.operatorId = oid(ctx.staffId);
    await row.save();
    await recomputeCounts(trip);

    await transportAlertService.raise({
      schoolId: ctx.schoolId,
      type: 'STUDENT_ABSENT',
      severity: 'LOW',
      title: 'Student not boarded',
      body: `${row.studentName || 'A student'} was marked absent for ${trip.tripType.toLowerCase().replace('_', ' ')}.`,
      tripId: trip._id,
      routeId: trip.routeId,
      studentId: oid(studentId),
      raisedBy: oid(ctx.staffId),
    });
    if (ctx.settings.absentNotify) {
      transportNotifyService.notifyParent(ctx.schoolId, studentId, {
        title: 'Not boarded',
        body: `${row.studentName || 'Your child'} was not marked as boarded for today's school transport.`,
      });
    }
    if (ctx.settings.notifyClassTeacherOnAbsent) {
      transportNotifyService.notifyClassTeacher(ctx.schoolId, studentId, {
        title: 'Transport: student absent',
        body: `${row.studentName || 'A student'} did not board the school bus today.`,
      });
    }
    return { data: tripStudentLite(row), idempotent: false };
  }

  async exception(ctx, tripId, studentId, body = {}) {
    const trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    const row = await transportAccessService.assertStudentOnTrip(tripId, studentId);
    const type = String(body.type || 'OTHER').toUpperCase();
    const description = String(body.description || '').trim();
    if (!description) throw new AppError('A description is required', 400, TRANSPORT_ERR.VALIDATION_ERROR);

    const incident = await TransportIncident.create({
      schoolId: trip.schoolId,
      routeId: trip.routeId,
      vehicleId: trip.vehicleId,
      studentId: oid(studentId),
      driverId: trip.driverId || null,
      incidentType: 'OTHER',
      incidentDate: new Date(),
      title: `Transport exception: ${type}`,
      description,
      priority: 'MEDIUM',
      status: 'REPORTED',
    });
    row.notes = `${row.notes ? row.notes + ' | ' : ''}[${type}] ${description}`.slice(0, 500);
    await row.save();

    await transportAlertService.raise({
      schoolId: ctx.schoolId,
      type: 'MISSED_DROP',
      severity: 'MEDIUM',
      title: `Exception — ${row.studentName || 'student'}`,
      body: description,
      tripId: trip._id,
      routeId: trip.routeId,
      studentId: oid(studentId),
      refType: 'TransportIncident',
      refId: String(incident._id),
      raisedBy: oid(ctx.staffId),
    });
    transportNotifyService.notifyParent(ctx.schoolId, studentId, {
      title: 'Transport update',
      body: 'There was an update on your child’s school transport. Please check the app.',
    });
    return { data: tripStudentLite(row), incidentId: String(incident._id) };
  }
}

export const transportBoardingService = new TransportBoardingService();
