import mongoose from 'mongoose';

export const TRIP_TYPES = ['MORNING_PICKUP', 'SCHOOL_ARRIVAL', 'AFTERNOON_DROPOFF', 'HOME_DROP'];
export const TRIP_STATUSES = [
  'SCHEDULED',
  'INSPECTION_PENDING',
  'READY',
  'STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'ABORTED',
  'FAILED',
];
export const TERMINAL_TRIP_STATUSES = ['COMPLETED', 'CANCELLED', 'ABORTED', 'FAILED'];

// Explicit state machine — any transition not listed is a 409 INVALID_TRIP_TRANSITION.
export const ALLOWED_TRANSITIONS = {
  SCHEDULED: ['INSPECTION_PENDING', 'READY', 'STARTED', 'CANCELLED'],
  INSPECTION_PENDING: ['READY', 'CANCELLED'],
  READY: ['STARTED', 'CANCELLED'],
  STARTED: ['IN_PROGRESS', 'COMPLETED', 'ABORTED', 'FAILED'],
  IN_PROGRESS: ['COMPLETED', 'ABORTED', 'FAILED'],
  COMPLETED: [],
  CANCELLED: [],
  ABORTED: [],
  FAILED: [],
};

export function canTransition(from, to) {
  return Array.isArray(ALLOWED_TRANSITIONS[from]) && ALLOWED_TRANSITIONS[from].includes(to);
}

const tripStopSchema = new mongoose.Schema(
  {
    stopId: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteStop', required: true },
    stopName: { type: String, default: '', trim: true },
    sequenceOrder: { type: Number, required: true },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    expectedAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    departedAt: { type: Date, default: null },
    delayMin: { type: Number, default: 0 },
    studentsExpected: { type: Number, default: 0 },
    boarded: { type: Number, default: 0 },
    dropped: { type: Number, default: 0 },
  },
  { _id: false }
);

const tripSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    conductorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    tripType: { type: String, enum: TRIP_TYPES, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (school-local)
    scheduledStart: { type: Date, default: null },
    scheduledEnd: { type: Date, default: null },
    actualStart: { type: Date, default: null },
    actualEnd: { type: Date, default: null },
    status: { type: String, enum: TRIP_STATUSES, default: 'SCHEDULED', index: true },
    inspectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'VehicleInspection', default: null },
    inspectionPassed: { type: Boolean, default: false },
    currentStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteStop', default: null },
    lastLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      speed: { type: Number, default: null },
      heading: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      at: { type: Date, default: null },
    },
    counts: {
      studentsExpected: { type: Number, default: 0 },
      boarded: { type: Number, default: 0 },
      dropped: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
    },
    stops: { type: [tripStopSchema], default: [] },
    abortReason: { type: String, default: '', trim: true },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true }
);

// One live trip per route/date/type (anti-duplicate). Terminal trips are excluded
// so a cancelled/failed trip can be re-created for the same slot.
tripSchema.index(
  { schoolId: 1, routeId: 1, date: 1, tripType: 1 },
  { unique: true, partialFilterExpression: { status: { $nin: TERMINAL_TRIP_STATUSES } } }
);
tripSchema.index({ schoolId: 1, driverId: 1, date: 1 });
tripSchema.index({ schoolId: 1, status: 1, date: 1 });
tripSchema.index({ schoolId: 1, vehicleId: 1, date: 1 });
tripSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

tripSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    routeId: this.routeId.toString(),
    vehicleId: this.vehicleId.toString(),
    driverId: this.driverId ? this.driverId.toString() : null,
    conductorId: this.conductorId ? this.conductorId.toString() : null,
    tripType: this.tripType,
    date: this.date,
    scheduledStart: this.scheduledStart,
    scheduledEnd: this.scheduledEnd,
    actualStart: this.actualStart,
    actualEnd: this.actualEnd,
    status: this.status,
    inspectionPassed: Boolean(this.inspectionPassed),
    currentStopId: this.currentStopId ? this.currentStopId.toString() : null,
    lastLocation: this.lastLocation?.at ? this.lastLocation : null,
    counts: this.counts || { studentsExpected: 0, boarded: 0, dropped: 0, absent: 0 },
    stops: (this.stops || []).map((s) => ({
      stopId: s.stopId.toString(),
      stopName: s.stopName || '',
      sequenceOrder: s.sequenceOrder,
      lat: s.lat,
      lng: s.lng,
      expectedAt: s.expectedAt,
      arrivedAt: s.arrivedAt,
      departedAt: s.departedAt,
      delayMin: s.delayMin || 0,
      studentsExpected: s.studentsExpected || 0,
      boarded: s.boarded || 0,
      dropped: s.dropped || 0,
    })),
    abortReason: this.abortReason || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Trip = mongoose.model('Trip', tripSchema);
