import mongoose from 'mongoose';

const transportIncidentSchema = new mongoose.Schema(
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
      default: null,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
    incidentType: {
      type: String,
      enum: [
        'BREAKDOWN',
        'TRAFFIC_DELAY',
        'STUDENT_MISBEHAVIOR',
        'ACCIDENT_SCRATCH',
        'DRIVER_ISSUE',
        'ROUTE_DEVIATION',
        'MEDICAL_EMERGENCY',
        'OTHER',
      ],
      default: 'OTHER',
      required: true,
    },
    incidentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    actionTaken: {
      type: String,
      default: '',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
      index: true,
    },
    status: {
      type: String,
      enum: ['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'],
      default: 'REPORTED',
      index: true,
    },
  },
  { timestamps: true }
);

transportIncidentSchema.index({ schoolId: 1, status: 1 });
transportIncidentSchema.index({ schoolId: 1, vehicleId: 1, incidentDate: -1 });

export const TransportIncident = mongoose.model(
  'TransportIncident',
  transportIncidentSchema
);
