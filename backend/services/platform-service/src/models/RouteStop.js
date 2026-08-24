import mongoose from 'mongoose';

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
      default: '07:30 AM',
      trim: true,
    },
    dropTime: {
      type: String,
      required: true,
      default: '03:30 PM',
      trim: true,
    },
    monthlyFee: {
      type: Number,
      required: true,
      default: 1500,
      min: 0,
    },
    landmark: {
      type: String,
      default: '',
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

routeStopSchema.index({ schoolId: 1, routeId: 1, sequenceOrder: 1 });
routeStopSchema.index({ schoolId: 1, routeId: 1, stopName: 1 });

export const RouteStop = mongoose.model('RouteStop', routeStopSchema);
