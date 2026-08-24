import mongoose from 'mongoose';

const employeeDocumentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    employeeRefId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeType: {
      type: String,
      enum: ['TEACHER', 'STAFF'],
      required: true,
      default: 'STAFF',
    },
    employeeId: {
      type: String,
      required: true,
      trim: true,
    },
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      default: '',
      trim: true,
    },
    documentType: {
      type: String,
      enum: [
        'PAN Card',
        'Aadhaar Card',
        'Degree / Certificate',
        'Experience Letter',
        'Joining Contract',
        'Police Verification',
        'Medical Certificate',
        'Identity Proof',
        'Other',
      ],
      required: true,
      default: 'Identity Proof',
    },
    documentName: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    verificationStatus: {
      type: String,
      enum: ['VERIFIED', 'PENDING', 'REJECTED'],
      default: 'VERIFIED',
      index: true,
    },
    verifiedBy: {
      type: String,
      default: 'HR Admin',
      trim: true,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

employeeDocumentSchema.index({ schoolId: 1, employeeRefId: 1 });
employeeDocumentSchema.index({ schoolId: 1, documentType: 1 });
employeeDocumentSchema.index({ schoolId: 1, verificationStatus: 1 });

employeeDocumentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    employeeRefId: this.employeeRefId.toString(),
    employeeType: this.employeeType,
    employeeId: this.employeeId,
    employeeName: this.employeeName,
    department: this.department,
    documentType: this.documentType,
    documentName: this.documentName,
    url: this.fileUrl,
    fileUrl: this.fileUrl,
    fileSize: this.fileSize,
    verificationStatus: this.verificationStatus,
    status: this.verificationStatus,
    verifiedBy: this.verifiedBy,
    remarks: this.remarks,
    uploadedAt: this.createdAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const EmployeeDocument = mongoose.model('EmployeeDocument', employeeDocumentSchema);
