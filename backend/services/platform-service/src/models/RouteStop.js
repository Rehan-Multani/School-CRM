import mongoose from 'mongoose';

/**
 * Step 3 of the transport flow — an ordered stop on a route with its scheduled
 * times. `pickupTime` / `dropTime` are MANDATORY: they are the single source of
 * truth a student's timing is read from (step 5), so a stop without them would
 * leave assigned students with no schedule.
 *
 * Times are stored as normalized 12-hour display strings ("07:30 AM"); the
 * service layer normalizes every inbound value before it reaches this model.
 */
const routeStopSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportRoute',
      required: true,
      index: true,
    },
    stopName: {
      type: String,
      required: true,
      trim: true,
    },
    sequenceOrder: {
      type: Number,
      required: true,
      min: 1,
    },
    pickupTime: {
      type: String,
      required: true,
      trim: true,
    },
    dropTime: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

routeStopSchema.index({ schoolId: 1, routeId: 1, sequenceOrder: 1 });
// No two stops on one route may share a name — otherwise the admin picking a
// pickup stop in step 5 cannot tell them apart.
routeStopSchema.index({ routeId: 1, stopName: 1 }, { unique: true });

routeStopSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    routeId: this.routeId.toString(),
    stopName: this.stopName,
    sequenceOrder: this.sequenceOrder,
    pickupTime: this.pickupTime,
    dropTime: this.dropTime,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const RouteStop = mongoose.model('RouteStop', routeStopSchema);
