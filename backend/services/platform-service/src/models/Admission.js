import mongoose from 'mongoose';

export const ADMISSION_STATUSES = [
  'PENDING_REVIEW',
  'WAITING_LIST',
  'APPROVED',
  'REJECTED',
  'ENROLLED',
];
export const ADMISSION_SOURCES = ['ONLINE', 'OFFLINE', 'REFERRAL'];
export const ADMISSION_GENDERS = ['MALE', 'FEMALE', 'OTHER'];

const admissionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    applicantName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ADMISSION_GENDERS, default: 'OTHER' },
    dob: { type: Date, default: null },
    appliedClassId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: null, index: true },
    appliedClassLabel: { type: String, default: '', trim: true },
    preferredSectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
    guardianName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    previousSchool: { type: String, default: '', trim: true },
    category: { type: String, default: 'General', trim: true },
    source: { type: String, enum: ADMISSION_SOURCES, default: 'ONLINE' },
    documents: {
      type: [{ type: { type: String }, name: String, url: String, verified: Boolean }],
      default: [],
    },
    documentsStatus: { type: String, default: 'Pending', trim: true },
    status: {
      type: String,
      enum: ADMISSION_STATUSES,
      default: 'PENDING_REVIEW',
      index: true,
    },
    appliedDate: { type: Date, default: () => new Date() },
    reviewedBy: { type: String, default: '', trim: true },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '', trim: true },
    convertedStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    admissionNo: { type: String, default: '', trim: true },
    studentId: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

admissionSchema.index({ schoolId: 1, status: 1, appliedDate: -1 });

admissionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    applicantName: this.applicantName,
    gender: this.gender,
    dob: this.dob,
    appliedClassId: this.appliedClassId ? this.appliedClassId.toString() : null,
    appliedClassLabel: this.appliedClassLabel || '',
    preferredSectionId: this.preferredSectionId ? this.preferredSectionId.toString() : null,
    guardianName: this.guardianName || '',
    phone: this.phone || '',
    email: this.email || '',
    address: this.address || '',
    previousSchool: this.previousSchool || '',
    category: this.category || 'General',
    source: this.source,
    documents: this.documents || [],
    documentsStatus: this.documentsStatus || 'Pending',
    status: this.status,
    appliedDate: this.appliedDate,
    reviewedBy: this.reviewedBy || '',
    reviewedAt: this.reviewedAt,
    rejectionReason: this.rejectionReason || '',
    convertedStudentId: this.convertedStudentId ? this.convertedStudentId.toString() : null,
    admissionNo: this.admissionNo || '',
    studentId: this.studentId || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Admission = mongoose.model('Admission', admissionSchema);
