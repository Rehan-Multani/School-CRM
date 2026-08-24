import mongoose from 'mongoose';

const vehicleMaintenanceSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    serviceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    serviceType: {
      type: String,
      enum: [
        'OIL_CHANGE',
        'TYRE_REPLACEMENT',
        'BRAKE_SERVICE',
        'BATTERY',
        'GENERAL_SERVICE',
        'ACCIDENT_REPAIR',
        'BODY_WORK',
        'AC_SERVICE',
        'OTHER',
      ],
      default: 'GENERAL_SERVICE',
      required: true,
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    odometerReadingKm: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextServiceDueKm: {
      type: Number,
      default: null,
    },
    nextServiceDueDate: {
      type: Date,
      default: null,
    },
    vendorWorkshop: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

vehicleMaintenanceSchema.index({ schoolId: 1, vehicleId: 1, serviceDate: -1 });

export const VehicleMaintenance = mongoose.model(
  'VehicleMaintenance',
  vehicleMaintenanceSchema
);
