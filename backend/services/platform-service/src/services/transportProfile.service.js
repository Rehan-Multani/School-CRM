import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { Vehicle } from '../models/Vehicle.js';
import { VehicleDocument } from '../models/VehicleDocument.js';
import { VehicleInspection } from '../models/VehicleInspection.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { RouteStop } from '../models/RouteStop.js';
import { TransportSettings } from '../models/TransportSettings.js';
import { staffSelf, vehicleLite, routeLite, inspectionLite } from '../serializers/transport.serializers.js';
import { deleteUploadedFile } from '../utils/upload.utils.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

class TransportProfileService {
  #staffId(ctx) {
    if (ctx.isSchoolAdmin) throw new AppError('This endpoint is for transport staff', 403, TRANSPORT_ERR.FORBIDDEN);
    return oid(ctx.staffId);
  }

  async getProfile(ctx) {
    const staff = await SchoolUser.findOne({ _id: this.#staffId(ctx), schoolId: oid(ctx.schoolId), role: 'TRANSPORT' });
    if (!staff) throw new AppError('Profile not found', 404, TRANSPORT_ERR.STAFF_NOT_FOUND);
    return staffSelf(staff);
  }

  async updateProfile(ctx, body = {}, files = {}) {
    const staff = await SchoolUser.findOne({ _id: this.#staffId(ctx), schoolId: oid(ctx.schoolId), role: 'TRANSPORT' });
    if (!staff) throw new AppError('Profile not found', 404, TRANSPORT_ERR.STAFF_NOT_FOUND);
    if (body.phone !== undefined) staff.phone = String(body.phone).trim().slice(0, 20);
    if (body.emergencyContact && typeof body.emergencyContact === 'object') {
      staff.emergencyContact = {
        name: String(body.emergencyContact.name || staff.emergencyContact?.name || '').slice(0, 100),
        phone: String(body.emergencyContact.phone || staff.emergencyContact?.phone || '').slice(0, 20),
        relationship: String(body.emergencyContact.relationship || staff.emergencyContact?.relationship || '').slice(0, 50),
      };
    }
    if (files.photo) {
      // collectSchoolUserUploadFiles already returns a public path string
      const prev = staff.photo;
      staff.photo = files.photo;
      if (prev && prev !== files.photo) deleteUploadedFile(prev);
    }
    await staff.save();
    return staffSelf(staff);
  }

  #resolveVehicleId(ctx, queryVehicleId) {
    if (ctx.isManager && queryVehicleId && mongoose.isValidObjectId(String(queryVehicleId))) return String(queryVehicleId);
    if (ctx.assignedVehicleId) return ctx.assignedVehicleId;
    throw new AppError('No vehicle is assigned to you', 409, TRANSPORT_ERR.NO_ASSIGNMENT);
  }

  async vehicle(ctx, queryVehicleId) {
    const id = this.#resolveVehicleId(ctx, queryVehicleId);
    const v = await Vehicle.findOne({ _id: oid(id), schoolId: oid(ctx.schoolId) }).lean();
    if (!v) throw new AppError('Vehicle not found', 404, TRANSPORT_ERR.NOT_FOUND);
    return { ...vehicleLite(v), status: v.status, insuranceExpiry: v.insuranceExpiry, fitnessExpiry: v.fitnessExpiry, permitExpiry: v.permitExpiry, pollutionExpiry: v.pollutionExpiry };
  }

  async vehicleDocuments(ctx, queryVehicleId) {
    const id = this.#resolveVehicleId(ctx, queryVehicleId);
    const rows = await VehicleDocument.find({ schoolId: oid(ctx.schoolId), vehicleId: oid(id) }).sort({ expiryDate: 1 });
    return rows.map((r) => r.toPublicJSON());
  }

  async inspectionHistory(ctx, queryVehicleId, query = {}) {
    const id = this.#resolveVehicleId(ctx, queryVehicleId);
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const filter = { schoolId: oid(ctx.schoolId), vehicleId: oid(id) };
    const [rows, total] = await Promise.all([
      VehicleInspection.find(filter).sort({ inspectedAt: -1 }).skip(skip).limit(limit),
      VehicleInspection.countDocuments(filter),
    ]);
    return { data: rows.map((r) => inspectionLite(r)), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async route(ctx, queryRouteId) {
    let id = ctx.assignedRouteId;
    if (ctx.isManager && queryRouteId && mongoose.isValidObjectId(String(queryRouteId))) id = String(queryRouteId);
    if (!id) throw new AppError('No route is assigned to you', 409, TRANSPORT_ERR.NO_ASSIGNMENT);
    const route = await TransportRoute.findOne({ _id: oid(id), schoolId: oid(ctx.schoolId) }).lean();
    if (!route) throw new AppError('Route not found', 404, TRANSPORT_ERR.NOT_FOUND);
    const stops = await RouteStop.find({ schoolId: oid(ctx.schoolId), routeId: route._id }).sort({ sequenceOrder: 1 }).lean();
    return routeLite(route, stops);
  }

  async getSettings(ctx) {
    await TransportSettings.getOrDefault(oid(ctx.schoolId)); // upsert if missing
    const doc = await TransportSettings.findOne({ schoolId: oid(ctx.schoolId) });
    return doc.toPublicJSON();
  }

  async updateSettings(ctx, body = {}) {
    if (!ctx.isManager) throw new AppError('Only a transport manager can change settings', 403, TRANSPORT_ERR.TRANSPORT_ROLE_REQUIRED);
    const BOOL = [
      'gpsEnabled', 'liveTrackingEnabled', 'parentLiveLocationEnabled', 'inspectionRequired',
      'criticalInspectionBlocksTrip', 'boardingNotify', 'dropNotify', 'absentNotify', 'notifyClassTeacherOnAbsent',
    ];
    const NUM = [
      'delayThresholdMin', 'significantDelayThresholdMin', 'staleGpsMinutes', 'routeDeviationToleranceM',
      'routeDeviationConsecutive', 'pickupDropToleranceMin', 'documentExpiryReminderDays',
    ];
    const patch = { updatedBy: oid(ctx.staffId) };
    for (const k of BOOL) if (body[k] !== undefined) patch[k] = Boolean(body[k]);
    for (const k of NUM) if (body[k] !== undefined && Number.isFinite(Number(body[k]))) patch[k] = Math.max(0, Number(body[k]));
    if (Array.isArray(body.sosRecipientRoles)) {
      patch.sosRecipientRoles = body.sosRecipientRoles.map((r) => String(r).toUpperCase()).slice(0, 8);
    }
    const doc = await TransportSettings.findOneAndUpdate(
      { schoolId: oid(ctx.schoolId) },
      { $set: patch, $setOnInsert: { schoolId: oid(ctx.schoolId) } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return doc.toPublicJSON();
  }
}

export const transportProfileService = new TransportProfileService();
