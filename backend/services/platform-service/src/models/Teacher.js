import mongoose from 'mongoose';

const qualificationSchema = new mongoose.Schema(
  {
    degree: { type: String, default: '', trim: true },
    specialization: { type: String, default: '', trim: true },
    institution: { type: String, default: '', trim: true },
    passingYear: { type: Number, default: null },
    score: { type: String, default: '', trim: true },
    certificateFile: { type: String, default: '', trim: true },
  },
  { _id: true }
);

const experienceSchema = new mongoose.Schema(
  {
    organization: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    description: { type: String, default: '', trim: true },
    certificateFile: { type: String, default: '', trim: true },
  },
  { _id: true }
);

const emptyDocuments = () => ({ pan: [], aadhaar: [], others: [] });

function publicDocuments(docs) {
  if (docs && !Array.isArray(docs) && typeof docs === 'object') {
    return {
      pan: Array.isArray(docs.pan) ? docs.pan.filter(Boolean) : [],
      aadhaar: Array.isArray(docs.aadhaar) ? docs.aadhaar.filter(Boolean) : [],
      others: Array.isArray(docs.others) ? docs.others.filter(Boolean) : [],
    };
  }
  return emptyDocuments();
}

const teacherSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    employeeId: { type: String, default: '', trim: true },
    name: { type: String, required: true, trim: true },
    firstName: { type: String, default: '', trim: true },
    middleName: { type: String, default: '', trim: true },
    lastName: { type: String, default: '', trim: true },
    profilePhoto: { type: String, default: '', trim: true },
    gender: { type: String, enum: ['', 'MALE', 'FEMALE', 'OTHER'], default: '' },
    dateOfBirth: { type: Date, default: null },
    bloodGroup: { type: String, default: '', trim: true },
    maritalStatus: { type: String, enum: ['', 'SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'], default: '' },
    nationality: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    phone: { type: String, default: '', trim: true },
    department: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true },
    joiningDate: { type: Date, default: null },
    employmentType: {
      type: String,
      enum: ['', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'VISITING', 'TEMPORARY'],
      default: '',
    },
    experienceSummary: { type: String, default: '', trim: true },
    previousExperienceSummary: { type: String, default: '', trim: true },
    specialization: { type: String, default: '', trim: true },
    mobileNumber: { type: String, default: '', trim: true },
    alternateMobile: { type: String, default: '', trim: true },
    emergencyContactName: { type: String, default: '', trim: true },
    emergencyContactNumber: { type: String, default: '', trim: true },
    emergencyContactRelationship: { type: String, default: '', trim: true },
    address: {
      addressLine: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true },
      country: { type: String, default: '', trim: true },
      pincode: { type: String, default: '', trim: true },
    },
    qualifications: { type: [qualificationSchema], default: [] },
    experiences: { type: [experienceSchema], default: [] },
    documents: { type: mongoose.Schema.Types.Mixed, default: emptyDocuments },
    payroll: {
      bankName: { type: String, default: '', trim: true },
      accountHolderName: { type: String, default: '', trim: true },
      accountNumber: { type: String, default: '', trim: true },
      ifsc: { type: String, default: '', trim: true },
      branch: { type: String, default: '', trim: true },
      pan: { type: String, default: '', trim: true },
      uan: { type: String, default: '', trim: true },
      pfNumber: { type: String, default: '', trim: true },
      salaryType: { type: String, enum: ['', 'MONTHLY', 'HOURLY', 'DAILY'], default: 'MONTHLY' },
      basicSalary: { type: Number, default: null },
    },
    account: {
      createLoginAccount: { type: Boolean, default: false },
      loginEmail: { type: String, default: '', trim: true, lowercase: true },
      username: { type: String, default: '', trim: true },
      accountStatus: { type: String, enum: ['', 'PENDING', 'ACTIVE', 'INACTIVE'], default: '' },
    },
    attendanceSettings: {
      attendanceId: { type: String, default: '', trim: true },
      weeklyOff: { type: String, default: '', trim: true },
      leavePolicy: { type: String, default: '', trim: true },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'PENDING_APPROVAL', 'PENDING', 'REJECTED'],
      default: 'PENDING_APPROVAL',
    },
  },
  { timestamps: true }
);

teacherSchema.index({ schoolId: 1, email: 1 });
teacherSchema.index({ schoolId: 1, name: 1 });

teacherSchema.methods.toPublicJSON = function toPublicJSON() {
  const firstName = this.firstName || this.name?.split(' ')[0] || '';
  const middleName = this.middleName || '';
  const lastName =
    this.lastName ||
    (this.name?.split(' ').length > 1 ? this.name.split(' ').slice(middleName ? 2 : 1).join(' ') : '');
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || this.name;
  const primaryPhone = this.mobileNumber || this.phone;
  const primaryEmail = this.email || this.account?.loginEmail || '';

  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    employeeId: this.employeeId,
    name: fullName,
    fullName,
    firstName,
    middleName,
    lastName,
    profilePhoto: this.profilePhoto,
    gender: this.gender,
    dateOfBirth: this.dateOfBirth,
    bloodGroup: this.bloodGroup,
    maritalStatus: this.maritalStatus,
    nationality: this.nationality,
    email: primaryEmail,
    phone: primaryPhone,
    mobileNumber: this.mobileNumber || this.phone,
    alternateMobile: this.alternateMobile,
    emergencyContactName: this.emergencyContactName,
    emergencyContactNumber: this.emergencyContactNumber,
    emergencyContactRelationship: this.emergencyContactRelationship,
    address: this.address || {},
    department: this.department,
    designation: this.designation,
    joiningDate: this.joiningDate,
    employmentType: this.employmentType,
    experienceSummary: this.experienceSummary,
    previousExperienceSummary: this.previousExperienceSummary,
    specialization: this.specialization,
    qualifications: this.qualifications || [],
    experiences: this.experiences || [],
    documents: publicDocuments(this.documents),
    payroll: this.payroll || {},
    account: this.account || {},
    attendanceSettings: this.attendanceSettings || {},
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Teacher = mongoose.model('Teacher', teacherSchema);
