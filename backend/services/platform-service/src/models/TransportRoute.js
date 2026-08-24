import mongoose from 'mongoose';

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
    routeCode: {
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
      ref: 'SchoolUser',
      default: null,
    },
    conductorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
    startPoint: {
      type: String,
      required: true,
      trim: true,
    },
    endPoint: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedDistanceKm: {
      type: Number,
      default: 0,
      min: 0,
    },
    estimatedDurationMin: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

transportRouteSchema.index({ schoolId: 1, routeCode: 1 }, { unique: true });
transportRouteSchema.index({ schoolId: 1, vehicleId: 1 });

export const TransportRoute = mongoose.model('TransportRoute', transportRouteSchema);
