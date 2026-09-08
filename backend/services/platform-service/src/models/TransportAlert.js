import mongoose from 'mongoose';

export const TRANSPORT_ALERT_TYPES = [
  'VEHICLE_ISSUE',
  'ROUTE_DELAY',
  'ROUTE_DEVIATION',
  'STUDENT_ABSENT',
  'MISSED_PICKUP',
  'MISSED_DROP',
  'EMERGENCY',
  'DOCUMENT_EXPIRY',
  'INSPECTION_FAILURE',
  'STALE_GPS',
  'NOTICE',
  'PICKUP_EVENT',
];
export const TRANSPORT_ALERT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const TRANSPORT_ALERT_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];

const transportAlertSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    type: { type: String, enum: TRANSPORT_ALERT_TYPES, required: true },
    severity: { type: String, enum: TRANSPORT_ALERT_SEVERITIES, default: 'MEDIUM' },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', default: null },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    refType: { type: String, default: '', trim: true }, // e.g. 'TransportIncident', 'TransportSOS', 'VehicleDocument'
    refId: { type: String, default: '', trim: true },
    status: { type: String, enum: TRANSPORT_ALERT_STATUSES, default: 'OPEN', index: true },
    audienceRoles: { type: [String], default: ['TRANSPORT_MANAGER', 'TRANSPORT_ADMIN'] },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    resolvedAt: { type: Date, default: null },
    // Dedupe: a job/service that raises the same logical alert re-uses dedupeKey
    // and honours cooldownUntil so GPS noise doesn't create an alert per ping.
    dedupeKey: { type: String, default: '', trim: true },
    cooldownUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

transportAlertSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
transportAlertSchema.index({ schoolId: 1, type: 1, dedupeKey: 1 });
transportAlertSchema.index({ schoolId: 1, tripId: 1, createdAt: -1 });

transportAlertSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    type: this.type,
    severity: this.severity,
    title: this.title,
    body: this.body || '',
    tripId: this.tripId ? this.tripId.toString() : null,
    vehicleId: this.vehicleId ? this.vehicleId.toString() : null,
    routeId: this.routeId ? this.routeId.toString() : null,
    studentId: this.studentId ? this.studentId.toString() : null,
    refType: this.refType || '',
    refId: this.refId || '',
    status: this.status,
    resolvedAt: this.resolvedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const TransportAlert = mongoose.model('TransportAlert', transportAlertSchema);
