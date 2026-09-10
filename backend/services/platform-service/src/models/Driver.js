import mongoose from 'mongoose';

export const DRIVER_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * Step 2 of the transport flow — the driver, and the vehicle handed to them.
 *
 * A driver is NOT a SchoolUser: they never touch the staff/HR surface and their
 * only capability is marking daily pickup/drop from the driver API. `vehicleId`
 * is the "Rahul Sharma → MP09AB1234" link; it is one-to-one and enforced in the
 * service layer.
 */
const driverSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    status: {
      type: String,
      enum: DRIVER_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
    photo: {
      type: String,
      default: '',
      trim: true,
    },
    licenseImage: {
      type: String,
      default: '',
      trim: true,
    },
    // Driver-API login. `passwordHash` is never selected by default nor
    // serialized; `loginEnabled` is the readable mirror the admin UI shows.
    passwordHash: { type: String, default: '', select: false },
    loginEnabled: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Mobile doubles as the login id, so it must be unique per school.
driverSchema.index({ schoolId: 1, mobile: 1 }, { unique: true });
driverSchema.index({ schoolId: 1, licenseNumber: 1 }, { unique: true });
// At most one driver per vehicle (a vehicle cannot have two drivers).
driverSchema.index(
  { schoolId: 1, vehicleId: 1 },
  { unique: true, partialFilterExpression: { vehicleId: { $type: 'objectId' } } }
);

driverSchema.methods.toPublicJSON = function toPublicJSON() {
  const vehicle = this.populated('vehicleId') ? this.vehicleId : null;
  return {
    id: this._id.toString(),
    name: this.name,
    mobile: this.mobile,
    licenseNumber: this.licenseNumber,
    vehicleId: this.vehicleId ? String(this.vehicleId._id || this.vehicleId) : null,
    vehicle: vehicle
      ? { id: vehicle._id.toString(), vehicleNumber: vehicle.vehicleNumber, capacity: vehicle.capacity }
      : null,
    photo: this.photo || '',
    licenseImage: this.licenseImage || '',
    loginEnabled: Boolean(this.loginEnabled),
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Driver = mongoose.model('Driver', driverSchema);
