import mongoose from 'mongoose';

const performanceReviewSchema = new mongoose.Schema(
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
    designation: {
      type: String,
      default: '',
      trim: true,
    },
    reviewerId: {
      type: String,
      default: '',
      trim: true,
    },
    reviewerName: {
      type: String,
      default: 'HR Manager',
      trim: true,
    },
    reviewPeriod: {
      type: String,
      required: true,
      trim: true, // e.g. '2025-2026 Q1', 'Annual 2025'
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    strengths: {
      type: String,
      default: '',
      trim: true,
    },
    areasOfImprovement: {
      type: String,
      default: '',
      trim: true,
    },
    goals: {
      type: String,
      default: '',
      trim: true,
    },
    comments: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'ACKNOWLEDGED'],
      default: 'SUBMITTED',
      index: true,
    },
    reviewDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

performanceReviewSchema.index({ schoolId: 1, employeeRefId: 1, reviewPeriod: 1 });
performanceReviewSchema.index({ schoolId: 1, rating: 1 });

performanceReviewSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    employeeRefId: this.employeeRefId.toString(),
    employeeType: this.employeeType,
    employeeId: this.employeeId,
    employeeName: this.employeeName,
    department: this.department,
    designation: this.designation,
    reviewerId: this.reviewerId,
    reviewerName: this.reviewerName,
    reviewPeriod: this.reviewPeriod,
    rating: this.rating,
    strengths: this.strengths,
    areasOfImprovement: this.areasOfImprovement,
    goals: this.goals,
    comments: this.comments,
    status: this.status,
    reviewDate: this.reviewDate,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const PerformanceReview = mongoose.model('PerformanceReview', performanceReviewSchema);
