import mongoose from 'mongoose';

/**
 * Raw GPS pings for a trip. No socket.io/Redis in this stack — the driver app
 * POSTs pings, parents/managers read the latest via polling (see
 * `Trip.lastLocation` for the fast path). Pings self-expire after 6h via a TTL
 * index; longer-term route history is out of v1 scope.
 */
const tripLocationPingSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    speed: { type: Number, default: null },
    heading: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    recordedAt: { type: Date, required: true },
    flagged: { type: Boolean, default: false }, // impossible-jump / low-accuracy heuristic
  },
  { timestamps: true }
);

// TTL — pings are ephemeral realtime data, kept 6h for a short trail.
tripLocationPingSchema.index({ createdAt: 1 }, { expireAfterSeconds: 21600 });
tripLocationPingSchema.index({ tripId: 1, recordedAt: 1 });

tripLocationPingSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    lat: this.lat,
    lng: this.lng,
    speed: this.speed,
    heading: this.heading,
    accuracy: this.accuracy,
    recordedAt: this.recordedAt,
    flagged: Boolean(this.flagged),
  };
};

export const TripLocationPing = mongoose.model('TripLocationPing', tripLocationPingSchema);
