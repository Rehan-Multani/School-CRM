import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    departmentName: {
      type: String,
      default: '',
      trim: true,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
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

designationSchema.index({ schoolId: 1, title: 1 }, { unique: true });
designationSchema.index({ schoolId: 1, departmentId: 1 });

designationSchema.methods.toPublicJSON = function toPublicJSON(extra = {}) {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    title: this.title,
    departmentId: this.departmentId ? this.departmentId.toString() : null,
    departmentName: this.departmentName || (this.departmentId?.name || ''),
    level: this.level,
    description: this.description,
    status: this.status,
    employeeCount: extra.employeeCount !== undefined ? extra.employeeCount : 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Designation = mongoose.model('Designation', designationSchema);
