import mongoose from 'mongoose';

const schoolClassSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    numericOrder: { type: Number, required: true, default: 0 },
    description: { type: String, default: '', trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    // School-Admin per-class toggle for Student Safe Pickup / Parent OTP.
    // Effective for a student = School.settings.safePickupEnabled AND this.
    safePickupEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schoolClassSchema.index({ schoolId: 1, academicYearId: 1, name: 1 }, { unique: true });
schoolClassSchema.index({ schoolId: 1, academicYearId: 1, code: 1 }, { unique: true });
schoolClassSchema.index({ schoolId: 1, academicYearId: 1, numericOrder: 1 });

schoolClassSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    academicYearId: this.academicYearId.toString(),
    name: this.name,
    code: this.code,
    numericOrder: this.numericOrder,
    description: this.description,
    status: this.status,
    safePickupEnabled: Boolean(this.safePickupEnabled),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SchoolClass = mongoose.model('SchoolClass', schoolClassSchema, 'classes');
