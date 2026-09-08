import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Trip } from '../models/Trip.js';
import { TripLocationPing } from '../models/TripLocationPing.js';
import { transportAccessService } from './transportAccess.service.js';
import { pingLite } from '../serializers/transport.serializers.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

class TransportLocationService {
  async ingest(ctx, tripId, body = {}) {
    if (!ctx.settings.gpsEnabled) {
      throw new AppError('GPS tracking is disabled for this school', 409, TRANSPORT_ERR.GPS_DISABLED);
    }
    const trip = await transportAccessService.loadTrip(ctx, tripId, { forWrite: true });
    if (!['STARTED', 'IN_PROGRESS'].includes(trip.status)) {
      throw new AppError('Location can only be reported for an active trip', 409, TRANSPORT_ERR.TRIP_NOT_ACTIVE);
    }
    if (!ctx.isManager && trip.driverId && String(trip.driverId) !== ctx.staffId && String(trip.conductorId) !== ctx.staffId) {
      throw new AppError('Only the assigned crew can report this trip location', 403, TRANSPORT_ERR.TRIP_ACCESS_DENIED);
    }

    const lat = Number(body.latitude ?? body.lat);
    const lng = Number(body.longitude ?? body.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new AppError('latitude/longitude are out of range', 400, TRANSPORT_ERR.GPS_INVALID_COORDS);
    }
    const accuracy = body.accuracy != null ? Number(body.accuracy) : null;
    if (accuracy != null && (!Number.isFinite(accuracy) || accuracy < 0)) {
      throw new AppError('accuracy must be a non-negative number', 400, TRANSPORT_ERR.GPS_INVALID_COORDS);
    }
    const speed = body.speed != null ? Number(body.speed) : null;
    if (speed != null && (!Number.isFinite(speed) || speed < 0 || speed > 200)) {
      throw new AppError('speed is out of a plausible range', 400, TRANSPORT_ERR.GPS_INVALID_COORDS);
    }
    const heading = body.heading != null ? Number(body.heading) : null;

    let recordedAt = body.timestamp ? new Date(body.timestamp) : new Date();
    if (Number.isNaN(recordedAt.getTime())) recordedAt = new Date();
    if (Math.abs(recordedAt.getTime() - Date.now()) > 10 * 60 * 1000) {
      throw new AppError('timestamp is too far from the server clock', 400, TRANSPORT_ERR.GPS_STALE_TIMESTAMP);
    }

    // impossible-jump heuristic — flag, never reject
    let flagged = false;
    const last = await TripLocationPing.findOne({ tripId: trip._id }).sort({ recordedAt: -1 }).select('lat lng recordedAt').lean();
    if (last) {
      const meters = haversineMeters({ lat: last.lat, lng: last.lng }, { lat, lng });
      const dtSec = Math.max(1, (recordedAt.getTime() - new Date(last.recordedAt).getTime()) / 1000);
      if (meters > 2000 && dtSec < 5) flagged = true;
    }

    await TripLocationPing.create({
      schoolId: trip.schoolId,
      tripId: trip._id,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId || null,
      lat,
      lng,
      speed,
      heading,
      accuracy,
      recordedAt,
      flagged,
    });
    trip.lastLocation = { lat, lng, speed, heading, accuracy, at: recordedAt };
    await trip.save();
    return { recorded: true, flagged };
  }

  async latest(ctx, tripId) {
    const trip = await transportAccessService.loadTrip(ctx, tripId);
    const loc = trip.lastLocation?.at ? trip.lastLocation : null;
    if (!loc) return { location: null, staleSeconds: null, message: 'Location unavailable' };
    const staleSeconds = Math.round((Date.now() - new Date(loc.at).getTime()) / 1000);
    return {
      location: { lat: loc.lat, lng: loc.lng, speed: loc.speed, heading: loc.heading, accuracy: loc.accuracy, at: loc.at },
      staleSeconds,
      stale: staleSeconds > (ctx.settings.staleGpsMinutes || 5) * 60,
    };
  }

  async history(ctx, tripId, query = {}) {
    await transportAccessService.loadTrip(ctx, tripId);
    const filter = { tripId: oid(tripId) };
    if (query.from) filter.recordedAt = { ...(filter.recordedAt || {}), $gte: new Date(query.from) };
    if (query.to) filter.recordedAt = { ...(filter.recordedAt || {}), $lte: new Date(query.to) };
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 50, maxLimit: 100 });
    const [rows, total] = await Promise.all([
      TripLocationPing.find(filter).sort({ recordedAt: 1 }).skip(skip).limit(limit),
      TripLocationPing.countDocuments(filter),
    ]);
    return {
      data: rows.map((r) => pingLite(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }
}

export const transportLocationService = new TransportLocationService();
