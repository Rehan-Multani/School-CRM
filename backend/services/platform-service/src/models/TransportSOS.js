import mongoose from 'mongoose';

export const SOS_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED'];
export const ACTIVE_SOS_STATUSES = ['ACTIVE', 'ACKNOWLEDGED'];

const transportSOSSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', required: true },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: SOS_STATUSES, default: 'ACTIVE', index: true },
    raisedAt: { type: Date, default: Date.now },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    acknowledgedAt: { type: Date, default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    resolvedAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    cancelledAt: { type: Date, default: null },
    resolutionNote: { type: String, default: '', trim: true },
    // true while ACTIVE or ACKNOWLEDGED; false on RESOLVED/CANCELLED. Backs the
    // partial-unique index (partialFilterExpression cannot use $in).
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// At most one open SOS per trip (anti-duplicate; never blocks a genuinely new
// emergency once the previous one is resolved/cancelled).
transportSOSSchema.index(
  { tripId: 1 },
  { unique: true, partialFilterExpression: { isOpen: true, tripId: { $type: 'objectId' } } }
);

transportSOSSchema.pre('save', function syncIsOpen(next) {
  this.isOpen = ACTIVE_SOS_STATUSES.includes(this.status);
  next();
});
transportSOSSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
transportSOSSchema.index({ schoolId: 1, driverId: 1, createdAt: -1 });

transportSOSSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    tripId: this.tripId ? this.tripId.toString() : null,
    vehicleId: this.vehicleId ? this.vehicleId.toString() : null,
    driverId: this.driverId.toString(),
    location: this.location?.lat != null ? this.location : null,
    description: this.description || '',
    status: this.status,
    raisedAt: this.raisedAt,
    acknowledgedAt: this.acknowledgedAt,
    resolvedAt: this.resolvedAt,
    cancelledAt: this.cancelledAt,
    resolutionNote: this.resolutionNote || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const TransportSOS = mongoose.model('TransportSOS', transportSOSSchema);
