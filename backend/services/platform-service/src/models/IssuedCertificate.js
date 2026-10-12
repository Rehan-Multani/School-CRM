import mongoose from 'mongoose';

export const ISSUED_STATUSES = ['ISSUED', 'REVOKED'];

/**
 * One certificate handed to one person. Everything printed on it is a
 * snapshot taken at issue time (text, design, signatory, variables), so the
 * template can change later without altering what the recipient holds.
 */
const issuedCertificateSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateTemplate', required: true, index: true },
    certificateNumber: { type: String, required: true, trim: true },
    // Public, unguessable code behind the QR / verification page.
    verifyCode: { type: String, required: true, unique: true, index: true },

    recipientType: { type: String, enum: ['STUDENT', 'TEACHER', 'STAFF'], required: true },
    recipientId: { type: String, required: true, index: true },
    recipientName: { type: String, required: true, trim: true },
    recipientRef: { type: String, default: '', trim: true },

    courseName: { type: String, default: '', trim: true },
    issueDate: { type: Date, required: true },
    validUntil: { type: Date, default: null },

    title: { type: String, required: true },
    type: { type: String, default: 'ACHIEVEMENT' },
    renderedText: { type: String, required: true },
    templateName: { type: String, default: '' },
    signatoryName: { type: String, default: '' },
    designation: { type: String, default: '' },
    signatureImage: { type: String, default: '' },
    design: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    variables: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    status: { type: String, enum: ISSUED_STATUSES, default: 'ISSUED', index: true },
    revokedAt: { type: Date, default: null },
    revokeReason: { type: String, default: '', trim: true },
    issuedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

issuedCertificateSchema.index({ schoolId: 1, certificateNumber: 1 }, { unique: true });
issuedCertificateSchema.index({ schoolId: 1, templateId: 1, recipientId: 1 });
issuedCertificateSchema.index({ schoolId: 1, createdAt: -1 });

issuedCertificateSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    templateId: String(this.templateId),
    certificateNumber: this.certificateNumber,
    verifyCode: this.verifyCode,
    recipientType: this.recipientType,
    recipientId: this.recipientId,
    recipientName: this.recipientName,
    recipientRef: this.recipientRef || '',
    courseName: this.courseName || '',
    issueDate: this.issueDate,
    validUntil: this.validUntil || null,
    title: this.title,
    type: this.type,
    renderedText: this.renderedText,
    templateName: this.templateName || '',
    signatoryName: this.signatoryName || '',
    designation: this.designation || '',
    signatureImage: this.signatureImage || '',
    design: this.design || {},
    variables: this.variables || {},
    status: this.status,
    revokedAt: this.revokedAt || null,
    revokeReason: this.revokeReason || '',
    issuedBy: this.issuedBy || '',
    createdAt: this.createdAt,
  };
};

export const IssuedCertificate =
  mongoose.models.IssuedCertificate || mongoose.model('IssuedCertificate', issuedCertificateSchema);
