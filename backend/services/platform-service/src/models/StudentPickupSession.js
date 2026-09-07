import mongoose from 'mongoose';

export const PICKUP_STATUSES = [
  'PENDING', // session created, OTP not yet sent (SMS pending/failed)
  'OTP_SENT', // OTP generated + dispatched
  'VERIFIED', // parent OTP verified — NOT yet handed over
  'COMPLETED', // teacher confirmed physical handover
  'EXPIRED', // OTP window elapsed
  'CANCELLED', // teacher cancelled
  'FAILED', // attempt limit exhausted
];
export const ACTIVE_PICKUP_STATUSES = ['PENDING', 'OTP_SENT', 'VERIFIED'];
export const PICKUP_RELATIONSHIPS = [
  'Parent',
  'Guardian',
  'Relative',
  'Family Friend',
  'Authorized Person',
  'Other',
];

function maskMobile(m) {
  const digits = String(m || '').replace(/\D/g, '');
  if (!digits) return '';
  return `${'*'.repeat(Math.max(2, digits.length - 4))}${digits.slice(-4)}`;
}

const studentPickupSessionSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, default: '', trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: null },
    className: { type: String, default: '', trim: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
    sectionName: { type: String, default: '', trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    teacherName: { type: String, default: '', trim: true },

    // Full number stored for the SMS send + audit trail; NEVER returned unmasked.
    guardianName: { type: String, default: '', trim: true },
    guardianMobile: { type: String, default: '', trim: true, select: false },

    status: { type: String, enum: PICKUP_STATUSES, default: 'PENDING', index: true },

    otpHash: { type: String, default: '', select: false }, // bcrypt; cleared on terminal/verified
    otpExpiresAt: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    maxOtpAttempts: { type: Number, default: 5 },
    resendCount: { type: Number, default: 0 },
    maxResends: { type: Number, default: 3 },
    lastOtpSentAt: { type: Date, default: null },

    verificationMethod: { type: String, default: 'PARENT_OTP' },
    pickupPersonName: { type: String, default: '', trim: true },
    pickupPersonRelationship: { type: String, enum: ['', ...PICKUP_RELATIONSHIPS], default: '' },
    handoverConfirmed: { type: Boolean, default: false },

    initiatedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },

    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },

    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true }
);

studentPickupSessionSchema.index({ schoolId: 1, studentId: 1, status: 1 });
studentPickupSessionSchema.index({ schoolId: 1, teacherId: 1, createdAt: -1 });
studentPickupSessionSchema.index({ schoolId: 1, createdAt: -1 });
studentPickupSessionSchema.index({ schoolId: 1, classId: 1, createdAt: -1 });
studentPickupSessionSchema.index({ otpExpiresAt: 1 });
// One active pickup session per student, DB-enforced (anti-race).
studentPickupSessionSchema.index(
  { studentId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_PICKUP_STATUSES } } }
);
// Idempotent initiate: a given key maps to at most one session.
studentPickupSessionSchema.index(
  { teacherId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

studentPickupSessionSchema.methods.toPublicJSON = function toPublicJSON() {
  const now = Date.now();
  const expMs = this.otpExpiresAt ? new Date(this.otpExpiresAt).getTime() : 0;
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    studentId: this.studentId.toString(),
    studentName: this.studentName || '',
    classId: this.classId ? this.classId.toString() : null,
    className: this.className || '',
    sectionId: this.sectionId ? this.sectionId.toString() : null,
    sectionName: this.sectionName || '',
    teacherId: this.teacherId ? this.teacherId.toString() : null,
    teacherName: this.teacherName || '',
    guardianName: this.guardianName || '',
    maskedMobile: maskMobile(this.guardianMobile),
    status: this.status,
    otpExpiresAt: this.otpExpiresAt,
    otpSecondsRemaining: expMs > now ? Math.round((expMs - now) / 1000) : 0,
    attemptsUsed: this.otpAttempts || 0,
    attemptsRemaining: Math.max(0, (this.maxOtpAttempts || 5) - (this.otpAttempts || 0)),
    resendCount: this.resendCount || 0,
    resendsRemaining: Math.max(0, (this.maxResends || 3) - (this.resendCount || 0)),
    pickupPersonName: this.pickupPersonName || '',
    pickupPersonRelationship: this.pickupPersonRelationship || '',
    handoverConfirmed: Boolean(this.handoverConfirmed),
    verificationMethod: this.verificationMethod,
    initiatedAt: this.initiatedAt,
    verifiedAt: this.verifiedAt,
    completedAt: this.completedAt,
    cancelledAt: this.cancelledAt,
    expiredAt: this.expiredAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

studentPickupSessionSchema.statics.maskMobile = maskMobile;

export const StudentPickupSession = mongoose.model('StudentPickupSession', studentPickupSessionSchema);
