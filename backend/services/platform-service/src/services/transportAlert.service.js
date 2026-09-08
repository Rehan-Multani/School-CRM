import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { TransportAlert } from '../models/TransportAlert.js';
import { ReadReceipt } from '../models/ReadReceipt.js';
import { Trip } from '../models/Trip.js';
import { alertLite } from '../serializers/transport.serializers.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const REF_TYPE = 'TRANSPORT_ALERT';

class TransportAlertService {
  /**
   * Raise (or dedupe) an alert. When `dedupeKey` is supplied, an existing OPEN
   * alert of the same {schoolId,type,dedupeKey} whose cooldown has not elapsed
   * is reused instead of creating a new row (GPS noise → one alert, not one per
   * ping). Returns the alert doc.
   */
  async raise({
    schoolId,
    type,
    severity = 'MEDIUM',
    title,
    body = '',
    tripId = null,
    vehicleId = null,
    routeId = null,
    studentId = null,
    refType = '',
    refId = '',
    raisedBy = null,
    audienceRoles,
    dedupeKey = '',
    cooldownMin = 0,
  }) {
    if (dedupeKey) {
      const existing = await TransportAlert.findOne({
        schoolId: oid(schoolId),
        type,
        dedupeKey,
        status: { $ne: 'RESOLVED' },
      }).sort({ createdAt: -1 });
      if (existing && (!existing.cooldownUntil || existing.cooldownUntil > new Date())) {
        return existing;
      }
    }
    return TransportAlert.create({
      schoolId: oid(schoolId),
      type,
      severity,
      title,
      body,
      tripId: tripId ? oid(tripId) : null,
      vehicleId: vehicleId ? oid(vehicleId) : null,
      routeId: routeId ? oid(routeId) : null,
      studentId: studentId ? oid(studentId) : null,
      refType,
      refId: String(refId || ''),
      raisedBy: raisedBy ? oid(raisedBy) : null,
      ...(audienceRoles ? { audienceRoles } : {}),
      dedupeKey,
      cooldownUntil: cooldownMin ? new Date(Date.now() + cooldownMin * 60000) : null,
    });
  }

  async #scopeFilter(ctx) {
    const base = { schoolId: oid(ctx.schoolId) };
    if (ctx.isManager) return base;
    // driver/conductor: alerts for trips they run + their vehicle/route + raised by them
    const myTrips = await Trip.find({
      schoolId: oid(ctx.schoolId),
      $or: [{ driverId: oid(ctx.staffId) }, { conductorId: oid(ctx.staffId) }],
    })
      .select('_id')
      .lean();
    const tripIds = myTrips.map((t) => t._id);
    return {
      ...base,
      $or: [
        { tripId: { $in: tripIds } },
        { raisedBy: oid(ctx.staffId) },
        ...(ctx.assignedVehicleId ? [{ vehicleId: oid(ctx.assignedVehicleId) }] : []),
        ...(ctx.assignedRouteId ? [{ routeId: oid(ctx.assignedRouteId) }] : []),
      ],
    };
  }

  async list(ctx, query = {}) {
    const filter = await this.#scopeFilter(ctx);
    if (query.status) filter.status = String(query.status).toUpperCase();
    if (query.type) filter.type = String(query.type).toUpperCase();
    if (query.severity) filter.severity = String(query.severity).toUpperCase();
    const { page, limit, skip } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const [rows, total] = await Promise.all([
      TransportAlert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      TransportAlert.countDocuments(filter),
    ]);
    const readSet = await this.#readSet(ctx.staffId, rows.map((r) => String(r._id)));
    const unread = rows.filter((r) => !readSet.has(String(r._id))).length;
    return {
      data: rows.map((r) => alertLite(r.toPublicJSON(), readSet.has(String(r._id)))),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
      meta: { unreadOnPage: unread },
    };
  }

  async get(ctx, id) {
    const filter = await this.#scopeFilter(ctx);
    const row = await TransportAlert.findOne({ ...filter, _id: oid(id) });
    if (!row) throw new AppError('Alert not found', 404, TRANSPORT_ERR.NOT_FOUND);
    const readSet = await this.#readSet(ctx.staffId, [String(row._id)]);
    return alertLite(row.toPublicJSON(), readSet.has(String(row._id)));
  }

  async markRead(ctx, id) {
    const filter = await this.#scopeFilter(ctx);
    const row = await TransportAlert.findOne({ ...filter, _id: oid(id) }).select('_id').lean();
    if (!row) throw new AppError('Alert not found', 404, TRANSPORT_ERR.NOT_FOUND);
    await ReadReceipt.updateOne(
      { userId: String(ctx.staffId), refType: REF_TYPE, refId: String(id) },
      { $setOnInsert: { schoolId: oid(ctx.schoolId), userType: 'TRANSPORT', readAt: new Date() } },
      { upsert: true }
    );
    return { message: 'Marked as read' };
  }

  async resolve(ctx, id, note = '') {
    const row = await TransportAlert.findOne({ schoolId: oid(ctx.schoolId), _id: oid(id) });
    if (!row) throw new AppError('Alert not found', 404, TRANSPORT_ERR.NOT_FOUND);
    const isRaiser = row.raisedBy && String(row.raisedBy) === ctx.staffId;
    if (!ctx.isManager && !isRaiser) {
      throw new AppError('Only a manager or the person who raised this alert can resolve it', 403, TRANSPORT_ERR.FORBIDDEN);
    }
    if (row.status === 'RESOLVED') {
      throw new AppError('This alert is already resolved', 409, TRANSPORT_ERR.ALERT_STATE_CONFLICT);
    }
    row.status = 'RESOLVED';
    row.resolvedBy = oid(ctx.staffId);
    row.resolvedAt = new Date();
    if (note) row.body = `${row.body}\n[resolution] ${String(note).slice(0, 500)}`.trim();
    await row.save();
    return alertLite(row.toPublicJSON(), true);
  }

  async #readSet(staffId, ids) {
    if (!ids.length) return new Set();
    const rows = await ReadReceipt.find({ userId: String(staffId), refType: REF_TYPE, refId: { $in: ids } })
      .select('refId')
      .lean();
    return new Set(rows.map((r) => r.refId));
  }
}

export const transportAlertService = new TransportAlertService();
