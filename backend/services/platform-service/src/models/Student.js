import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    admissionNumber: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], default: 'OTHER' },
    dateOfBirth: { type: Date, default: null },
    photo: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    parentName: { type: String, default: '', trim: true },
    parentPhone: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    documents: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ aadhaar: [], marksheet: [] })
    },
  },
  { timestamps: true }
);

studentSchema.index({ schoolId: 1, admissionNumber: 1 }, { unique: true });
studentSchema.index({ schoolId: 1, firstName: 1, lastName: 1 });
studentSchema.index({ schoolId: 1, email: 1 });

studentSchema.methods.toPublicJSON = function toPublicJSON() {
  const fullName = [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    admissionNumber: this.admissionNumber,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName,
    gender: this.gender,
    dateOfBirth: this.dateOfBirth,
    photo: this.photo,
    email: this.email,
    phone: this.phone,
    parentName: this.parentName,
    parentPhone: this.parentPhone,
    address: this.address,
    status: this.status,
    documents: this.documents || { aadhaar: [], marksheet: [] },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Student = mongoose.model('Student', studentSchema);
