import mongoose from 'mongoose';

export const VEHICLE_DOC_TYPES = ['RC', 'INSURANCE', 'FITNESS', 'PERMIT', 'POLLUTION', 'OTHER'];
export const VEHICLE_DOC_VERIFICATION = ['PENDING', 'VERIFIED', 'REJECTED'];

const vehicleDocumentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    docType: { type: String, enum: VEHICLE_DOC_TYPES, required: true },
    title: { type: String, default: '', trim: true },
    documentNumber: { type: String, default: '', trim: true },
    issueDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null, index: true },
    fileUrl: { type: String, default: '', trim: true },
    verificationStatus: { type: String, enum: VEHICLE_DOC_VERIFICATION, default: 'PENDING' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    verifiedAt: { type: Date, default: null },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

vehicleDocumentSchema.index({ schoolId: 1, vehicleId: 1, docType: 1 });
vehicleDocumentSchema.index({ schoolId: 1, expiryDate: 1 });

vehicleDocumentSchema.methods.toPublicJSON = function toPublicJSON() {
  const now = Date.now();
  const exp = this.expiryDate ? new Date(this.expiryDate).getTime() : null;
  return {
    id: this._id.toString(),
    vehicleId: this.vehicleId.toString(),
    docType: this.docType,
    title: this.title || this.docType,
    documentNumber: this.documentNumber || '',
    issueDate: this.issueDate,
    expiryDate: this.expiryDate,
    fileUrl: this.fileUrl || '',
    verificationStatus: this.verificationStatus,
    expired: exp != null ? exp < now : false,
    expiringInDays: exp != null ? Math.ceil((exp - now) / 86400000) : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const VehicleDocument = mongoose.model('VehicleDocument', vehicleDocumentSchema);
