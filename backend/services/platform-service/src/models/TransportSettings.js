import mongoose from 'mongoose';

/**
 * Per-school transport configuration. Business rules that vary by school
 * (thresholds, notification toggles, SOS recipients) live here — never
 * hardcoded in services. `getOrDefault` upserts a default doc on first read.
 */
const transportSettingsSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true },

    gpsEnabled: { type: Boolean, default: true },
    liveTrackingEnabled: { type: Boolean, default: true },
    parentLiveLocationEnabled: { type: Boolean, default: false },

    inspectionRequired: { type: Boolean, default: true },
    criticalInspectionBlocksTrip: { type: Boolean, default: true },

    delayThresholdMin: { type: Number, default: 10, min: 1 },
    significantDelayThresholdMin: { type: Number, default: 25, min: 1 },
    staleGpsMinutes: { type: Number, default: 5, min: 1 },
    routeDeviationToleranceM: { type: Number, default: 300, min: 20 },
    routeDeviationConsecutive: { type: Number, default: 3, min: 1 },
    pickupDropToleranceMin: { type: Number, default: 5, min: 0 },

    boardingNotify: { type: Boolean, default: true },
    dropNotify: { type: Boolean, default: true },
    absentNotify: { type: Boolean, default: true },
    notifyClassTeacherOnAbsent: { type: Boolean, default: false },

    sosRecipientRoles: { type: [String], default: ['TRANSPORT_MANAGER', 'TRANSPORT_ADMIN', 'SCHOOLADMIN'] },
    documentExpiryReminderDays: { type: Number, default: 30, min: 1 },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
  },
  { timestamps: true }
);

transportSettingsSchema.statics.getOrDefault = async function getOrDefault(schoolId) {
  const doc = await this.findOneAndUpdate(
    { schoolId },
    { $setOnInsert: { schoolId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return doc;
};

transportSettingsSchema.methods.toPublicJSON = function toPublicJSON() {
  const o = this.toObject ? this.toObject() : this;
  return {
    schoolId: String(o.schoolId),
    gpsEnabled: o.gpsEnabled,
    liveTrackingEnabled: o.liveTrackingEnabled,
    parentLiveLocationEnabled: o.parentLiveLocationEnabled,
    inspectionRequired: o.inspectionRequired,
    criticalInspectionBlocksTrip: o.criticalInspectionBlocksTrip,
    delayThresholdMin: o.delayThresholdMin,
    significantDelayThresholdMin: o.significantDelayThresholdMin,
    staleGpsMinutes: o.staleGpsMinutes,
    routeDeviationToleranceM: o.routeDeviationToleranceM,
    routeDeviationConsecutive: o.routeDeviationConsecutive,
    pickupDropToleranceMin: o.pickupDropToleranceMin,
    boardingNotify: o.boardingNotify,
    dropNotify: o.dropNotify,
    absentNotify: o.absentNotify,
    notifyClassTeacherOnAbsent: o.notifyClassTeacherOnAbsent,
    sosRecipientRoles: o.sosRecipientRoles || [],
    documentExpiryReminderDays: o.documentExpiryReminderDays,
  };
};

export const TransportSettings = mongoose.model('TransportSettings', transportSettingsSchema);
