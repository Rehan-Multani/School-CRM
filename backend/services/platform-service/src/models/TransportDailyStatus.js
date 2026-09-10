import mongoose from 'mongoose';

export const PICKUP_STATUSES = ['PENDING', 'PICKED_UP'];
export const DROP_STATUSES = ['PENDING', 'DROPPED'];

/**
 * Step 6 of the transport flow — the only thing a driver may write.
 *
 * One row per (student, date). The row is created lazily on the first mark of
 * the day, so a route nobody touched leaves no rows behind. This is NOT school
 * attendance: it records that the child was on the bus, nothing more.
 */
const transportDailyStatusSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD, school-local
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportRoute',
      required: true,
    },
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RouteStop',
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    pickupStatus: { type: String, enum: PICKUP_STATUSES, default: 'PENDING' },
    pickedUpAt: { type: Date, default: null },
    dropStatus: { type: String, enum: DROP_STATUSES, default: 'PENDING' },
    droppedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Idempotency anchor — one row per student per day, so a double-tap on the
// driver app can never create a second record.
transportDailyStatusSchema.index({ schoolId: 1, studentId: 1, date: 1 }, { unique: true });
transportDailyStatusSchema.index({ schoolId: 1, routeId: 1, date: 1 });

transportDailyStatusSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    date: this.date,
    studentId: this.studentId.toString(),
    routeId: this.routeId.toString(),
    stopId: this.stopId.toString(),
    pickupStatus: this.pickupStatus,
    pickedUpAt: this.pickedUpAt,
    dropStatus: this.dropStatus,
    droppedAt: this.droppedAt,
  };
};

export const TransportDailyStatus = mongoose.model(
  'TransportDailyStatus',
  transportDailyStatusSchema
);
