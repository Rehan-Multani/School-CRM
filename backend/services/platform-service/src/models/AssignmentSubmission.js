import mongoose from 'mongoose';

export const SUBMISSION_STATUSES = ['PENDING', 'SUBMITTED', 'LATE', 'GRADED'];

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, default: '', trim: true },
    rollNumber: { type: String, default: '', trim: true },
    status: { type: String, enum: SUBMISSION_STATUSES, default: 'PENDING' },
    submittedAt: { type: Date, default: null },
    text: { type: String, default: '', trim: true },
    attachments: { type: [{ name: String, url: String }], default: [] },
    marksObtained: { type: Number, default: null },
    feedback: { type: String, default: '', trim: true },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

assignmentSubmissionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    assignmentId: this.assignmentId.toString(),
    studentId: this.studentId.toString(),
    studentName: this.studentName || '',
    rollNumber: this.rollNumber || '',
    status: this.status,
    submittedAt: this.submittedAt,
    text: this.text || '',
    attachments: this.attachments || [],
    marksObtained: this.marksObtained,
    feedback: this.feedback || '',
    gradedBy: this.gradedBy ? this.gradedBy.toString() : null,
    gradedAt: this.gradedAt,
    updatedAt: this.updatedAt,
  };
};

export const AssignmentSubmission = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
