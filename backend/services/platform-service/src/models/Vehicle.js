import mongoose from 'mongoose';

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
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['BUS', 'MINIBUS', 'VAN', 'AUTO', 'OTHER'],
      default: 'BUS',
      required: true,
    },
    model: {
      type: String,
      default: '',
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      default: 40,
      min: 1,
    },
    fuelType: {
      type: String,
      enum: ['DIESEL', 'CNG', 'PETROL', 'ELECTRIC'],
      default: 'DIESEL',
    },
    insuranceExpiry: {
      type: Date,
      default: null,
    },
    fitnessExpiry: {
      type: Date,
      default: null,
    },
    pollutionExpiry: {
      type: Date,
      default: null,
    },
    permitExpiry: {
      type: Date,
      default: null,
    },
    gpsDeviceImei: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ schoolId: 1, vehicleNumber: 1 }, { unique: true });
vehicleSchema.index({ schoolId: 1, registrationNumber: 1 });

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
