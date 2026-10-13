import mongoose from 'mongoose';

export const ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'VISITED', 'ADMITTED', 'CLOSED'];

// One submission of the school's public student-enquiry form. The core fields are the
// built-in ones every school has; whatever extra fields the school added to its form
// land in `extra` as { key, label, value } so the list still reads if the form changes.
const studentEnquirySchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentName: { type: String, default: '', trim: true, maxlength: 120 },
    parentName: { type: String, default: '', trim: true, maxlength: 120 },
    mobile: { type: String, default: '', trim: true, maxlength: 20 },
    email: { type: String, default: '', trim: true, maxlength: 160 },
    classApplying: { type: String, default: '', trim: true, maxlength: 80 },
    extra: [
      {
        _id: false,
        key: { type: String, trim: true, maxlength: 60 },
        label: { type: String, trim: true, maxlength: 120 },
        value: { type: String, default: '', trim: true, maxlength: 1000 },
      },
    ],
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'NEW' },
    note: { type: String, default: '', trim: true, maxlength: 500 },
    source: { type: String, enum: ['FORM', 'STAFF'], default: 'FORM' },
  },
  { timestamps: true }
);

studentEnquirySchema.index({ schoolId: 1, createdAt: -1 });
studentEnquirySchema.index({ schoolId: 1, status: 1, createdAt: -1 });

studentEnquirySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    studentName: this.studentName || '',
    parentName: this.parentName || '',
    mobile: this.mobile || '',
    email: this.email || '',
    classApplying: this.classApplying || '',
    extra: (this.extra || []).map((e) => ({ key: e.key, label: e.label, value: e.value || '' })),
    status: this.status,
    note: this.note || '',
    source: this.source,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StudentEnquiry = mongoose.model('StudentEnquiry', studentEnquirySchema);
