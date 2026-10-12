import mongoose from 'mongoose';

export const CERTIFICATE_TYPES = [
  'ACHIEVEMENT',
  'PARTICIPATION',
  'COMPLETION',
  'MERIT',
  'SPORTS',
  'APPRECIATION',
  'BONAFIDE',
  'CUSTOM',
  // Layout documents designed in the canvas designer; printed for a class, not issued to people.
  'TIMETABLE',
  'FEE_STRUCTURE',
];
export const CERTIFICATE_APPLICABLE = ['STUDENT', 'TEACHER', 'STAFF'];
export const CERTIFICATE_STATUSES = ['DRAFT', 'PUBLISHED'];

/**
 * The certificate "master": wording, look and signatory. Individual
 * certificates are issued from it (IssuedCertificate) and keep their own
 * snapshot, so editing a template never changes what was already issued.
 */
const certificateTemplateSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: CERTIFICATE_TYPES, default: 'ACHIEVEMENT' },
    text: { type: String, required: true, trim: true, maxlength: 1500 },
    applicableTo: { type: String, enum: CERTIFICATE_APPLICABLE, default: 'STUDENT' },
    signatoryName: { type: String, default: '', trim: true, maxlength: 80 },
    designation: { type: String, default: '', trim: true, maxlength: 80 },
    // Uploaded signature image as a data URI (kept small, validated in the service).
    signatureImage: { type: String, default: '' },
    design: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    status: { type: String, enum: CERTIFICATE_STATUSES, default: 'DRAFT', index: true },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

certificateTemplateSchema.index({ schoolId: 1, name: 1 }, { unique: true });

certificateTemplateSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    title: this.title,
    type: this.type,
    text: this.text,
    applicableTo: this.applicableTo,
    signatoryName: this.signatoryName || '',
    designation: this.designation || '',
    signatureImage: this.signatureImage || '',
    design: this.design || {},
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const CertificateTemplate =
  mongoose.models.CertificateTemplate || mongoose.model('CertificateTemplate', certificateTemplateSchema);
