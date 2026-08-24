import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
    },
    headEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: 'SchoolUser',
    },
    headEmployeeName: {
      type: String,
      default: '',
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

departmentSchema.index({ schoolId: 1, name: 1 }, { unique: true });
departmentSchema.index({ schoolId: 1, code: 1 });

departmentSchema.methods.toPublicJSON = function toPublicJSON(extra = {}) {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    name: this.name,
    code: this.code,
    headEmployeeId: this.headEmployeeId ? this.headEmployeeId.toString() : null,
    headEmployeeName: this.headEmployeeName || '',
    description: this.description,
    status: this.status,
    employeeCount: extra.employeeCount !== undefined ? extra.employeeCount : 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Department = mongoose.model('Department', departmentSchema);
