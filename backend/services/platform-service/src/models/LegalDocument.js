import mongoose from 'mongoose';

const legalDocumentSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'platform' },
    privacyPolicy: { type: String, required: true, trim: true },
    termsOfService: { type: String, required: true, trim: true },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

legalDocumentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    privacyPolicy: this.privacyPolicy,
    termsOfService: this.termsOfService,
    updatedAt: this.updatedAt,
    updatedBy: this.updatedBy,
  };
};

export const LegalDocument = mongoose.model('LegalDocument', legalDocumentSchema);
