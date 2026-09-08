import mongoose from 'mongoose';

export const INSPECTION_RESULTS = ['PASS', 'FAIL', 'NOT_APPLICABLE'];

// The standard pre-trip checklist. `critical: true` items block trip start on FAIL
// unless an authorised override is recorded.
export const INSPECTION_CHECKLIST = [
  { key: 'brakes', label: 'Brakes', critical: true },
  { key: 'tyres', label: 'Tyres', critical: true },
  { key: 'lights', label: 'Lights & indicators', critical: true },
  { key: 'horn', label: 'Horn', critical: false },
  { key: 'doors', label: 'Doors', critical: true },
  { key: 'windows', label: 'Windows', critical: false },
  { key: 'firstAidKit', label: 'First aid kit', critical: true },
  { key: 'fireExtinguisher', label: 'Fire extinguisher', critical: true },
  { key: 'fuel', label: 'Fuel level', critical: false },
  { key: 'gps', label: 'GPS device', critical: false },
  { key: 'seats', label: 'Seat condition', critical: false },
  { key: 'cleanliness', label: 'Cleanliness', critical: false },
  { key: 'emergencyExit', label: 'Emergency exit', critical: true },
];
export const CRITICAL_ITEM_KEYS = INSPECTION_CHECKLIST.filter((i) => i.critical).map((i) => i.key);

const inspectionItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, default: '', trim: true },
    result: { type: String, enum: INSPECTION_RESULTS, default: 'PASS' },
    critical: { type: Boolean, default: false },
    remarks: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const vehicleInspectionSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', default: null },
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    inspectedAt: { type: Date, default: Date.now },
    items: { type: [inspectionItemSchema], default: [] },
    photos: { type: [String], default: [] },
    remarks: { type: String, default: '', trim: true },
    criticalFailed: { type: Boolean, default: false },
    overallResult: { type: String, enum: ['PASS', 'FAIL'], default: 'PASS' },
    overridden: { type: Boolean, default: false },
    overrideBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    overrideReason: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

vehicleInspectionSchema.index({ schoolId: 1, vehicleId: 1, inspectedAt: -1 });
vehicleInspectionSchema.index({ schoolId: 1, tripId: 1 });

vehicleInspectionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    vehicleId: this.vehicleId.toString(),
    tripId: this.tripId ? this.tripId.toString() : null,
    inspectedBy: this.inspectedBy ? this.inspectedBy.toString() : null,
    inspectedAt: this.inspectedAt,
    items: (this.items || []).map((i) => ({
      key: i.key,
      label: i.label,
      result: i.result,
      critical: Boolean(i.critical),
      remarks: i.remarks || '',
    })),
    photos: this.photos || [],
    remarks: this.remarks || '',
    criticalFailed: Boolean(this.criticalFailed),
    overallResult: this.overallResult,
    overridden: Boolean(this.overridden),
    overrideReason: this.overrideReason || '',
    createdAt: this.createdAt,
  };
};

export const VehicleInspection = mongoose.model('VehicleInspection', vehicleInspectionSchema);
