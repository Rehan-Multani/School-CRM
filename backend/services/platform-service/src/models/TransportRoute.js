import mongoose from 'mongoose';

export const ROUTE_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * Steps 3 + 4 of the transport flow — a named route, and the vehicle/driver
 * running it. Stops live in their own collection (RouteStop) because the admin
 * must reorder them independently of the route itself.
 *
 * `vehicleId` / `driverId` are null until step 4 assigns them.
 */
const transportRouteSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null,
    },
    status: {
      type: String,
      enum: ROUTE_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

transportRouteSchema.index({ schoolId: 1, routeName: 1 }, { unique: true });
// A vehicle / driver may run at most one route — enforced in the service, these
// indexes only make the lookups behind that check cheap.
transportRouteSchema.index({ schoolId: 1, vehicleId: 1 });
transportRouteSchema.index({ schoolId: 1, driverId: 1 });

transportRouteSchema.methods.toPublicJSON = function toPublicJSON() {
  const vehicle = this.populated('vehicleId') ? this.vehicleId : null;
  const driver = this.populated('driverId') ? this.driverId : null;
  return {
    id: this._id.toString(),
    routeName: this.routeName,
    vehicleId: this.vehicleId ? String(this.vehicleId._id || this.vehicleId) : null,
    driverId: this.driverId ? String(this.driverId._id || this.driverId) : null,
    vehicle: vehicle
      ? {
          id: vehicle._id.toString(),
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          capacity: vehicle.capacity,
        }
      : null,
    driver: driver
      ? { id: driver._id.toString(), name: driver.name, mobile: driver.mobile }
      : null,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const TransportRoute = mongoose.model('TransportRoute', transportRouteSchema);
