import mongoose from 'mongoose';

export const VEHICLE_TYPES = ['SCHOOL_BUS', 'MINI_BUS', 'VAN', 'OTHER'];
export const FUEL_TYPES = ['DIESEL', 'CNG', 'ELECTRIC', 'PETROL'];
export const VEHICLE_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * Step 1 of the transport flow — the fleet.
 *
 * Deliberately minimal: what the bus IS (number, kind, model, fuel) and how many
 * students it can carry. Paperwork that belongs to a vehicle's own detail page —
 * insurance, fitness, RC, permit, registration date — and anything operational
 * (GPS hardware, servicing, fuel logs) stay out of this module.
 */
const vehicleSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    vehicleType: {
      type: String,
      enum: VEHICLE_TYPES,
      default: 'SCHOOL_BUS',
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    // Free text — the make/model printed on the bus, e.g. "Tata Starbus".
    model: {
      type: String,
      default: '',
      trim: true,
    },
    fuelType: {
      type: String,
      enum: FUEL_TYPES,
      default: 'DIESEL',
    },
    status: {
      type: String,
      enum: VEHICLE_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

// One registration number per school — the anti-duplicate anchor for step 1.
vehicleSchema.index({ schoolId: 1, vehicleNumber: 1 }, { unique: true });

vehicleSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    vehicleNumber: this.vehicleNumber,
    vehicleType: this.vehicleType,
    capacity: this.capacity,
    model: this.model || '',
    fuelType: this.fuelType,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
