import mongoose from 'mongoose';

const bankDetailsSchema = new mongoose.Schema(
  {
    accountName: { type: String, default: '', trim: true },
    accountNumber: { type: String, default: '', trim: true },
    ifscCode: { type: String, default: '', trim: true, uppercase: true },
    bankName: { type: String, default: '', trim: true },
    branchName: { type: String, default: '', trim: true },
    accountType: {
      type: String,
      enum: ['SAVINGS', 'CURRENT', 'SALARY'],
      default: 'SALARY',
    },
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    relationship: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const schoolUserSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    employeeId: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: '', trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, default: '', select: false },
    role: {
      type: String,
      enum: ['TEACHER', 'LIBRARIAN', 'HR', 'ACCOUNTANT', 'TRANSPORT', 'PRINCIPAL'],
      required: true,
      index: true,
    },
    phone: { type: String, default: '', trim: true },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'],
      default: 'MALE',
    },
    dateOfBirth: { type: Date, default: null },
    bloodGroup: { type: String, default: '', trim: true },
    maritalStatus: { type: String, enum: ['', 'SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], default: '' },
    nationality: { type: String, default: '', trim: true },
    address: {
      addressLine: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true },
      country: { type: String, default: '', trim: true },
      pincode: { type: String, default: '', trim: true },
    },
    specialization: { type: String, default: '', trim: true },
    qualification: { type: String, default: '', trim: true },
    experienceSummary: { type: String, default: '', trim: true },
    employmentType: {
      type: String,
      enum: ['', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'VISITING', 'TEMPORARY'],
      default: 'FULL_TIME',
    },
    joiningDate: { type: Date, default: null },
    department: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true },
    basicSalary: { type: Number, default: 0, min: 0 },
    pan: { type: String, default: '', trim: true },
    uan: { type: String, default: '', trim: true },
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({}),
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({}),
    },
    documents: [{ type: String, trim: true }], // Max 3 image file paths
    photo: { type: String, default: '', trim: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'PENDING_APPROVAL', 'PENDING', 'REJECTED', 'ON_LEAVE', 'SUSPENDED'],
      default: 'PENDING_APPROVAL',
      index: true,
    },
    lastLoginAt: { type: Date, default: null },
    credentialsSentAt: { type: Date, default: null },
    preferences: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true }
);

schoolUserSchema.index({ schoolId: 1, email: 1 }, { unique: true });
schoolUserSchema.index({ schoolId: 1, employeeId: 1 }, { unique: true });
schoolUserSchema.index({ schoolId: 1, role: 1 });

schoolUserSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    employeeId: this.employeeId,
    firstName: this.firstName,
    lastName: this.lastName,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    gender: this.gender,
    dateOfBirth: this.dateOfBirth,
    bloodGroup: this.bloodGroup,
    maritalStatus: this.maritalStatus,
    nationality: this.nationality,
    address: this.address || {},
    specialization: this.specialization,
    qualification: this.qualification,
    experienceSummary: this.experienceSummary,
    employmentType: this.employmentType,
    joiningDate: this.joiningDate,
    department: this.department,
    designation: this.designation,
    basicSalary: this.basicSalary || 0,
    pan: this.pan,
    uan: this.uan,
    bankDetails: this.bankDetails || {
      accountName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      accountType: 'SALARY',
    },
    emergencyContact: this.emergencyContact || {
      name: '',
      phone: '',
      relationship: '',
    },
    documents: Array.isArray(this.documents) ? this.documents : [],
    photo: this.photo || '',
    status: this.status,
    preferences: this.preferences || {},
    lastLoginAt: this.lastLoginAt,
    credentialsSentAt: this.credentialsSentAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SchoolUser = mongoose.model('SchoolUser', schoolUserSchema);
