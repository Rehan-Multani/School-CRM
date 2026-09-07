import mongoose from 'mongoose';

export const HOMEWORK_SUBMISSION_STATUSES = ['PENDING', 'SUBMITTED', 'LATE', 'GRADED'];

const homeworkSubmissionSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    homeworkId: { type: mongoose.Schema.Types.ObjectId, ref: 'Homework', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, default: '', trim: true },
    rollNumber: { type: String, default: '', trim: true },
    status: { type: String, enum: HOMEWORK_SUBMISSION_STATUSES, default: 'PENDING' },
    submittedAt: { type: Date, default: null },
    remarks: { type: String, default: '', trim: true },
    attachments: { type: [{ name: String, url: String }], default: [] },
    marksObtained: { type: Number, default: null },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    gradedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

homeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });

homeworkSubmissionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    homeworkId: this.homeworkId.toString(),
    studentId: this.studentId.toString(),
    studentName: this.studentName || '',
    rollNumber: this.rollNumber || '',
    status: this.status,
    submittedAt: this.submittedAt,
    remarks: this.remarks || '',
    attachments: this.attachments || [],
    marksObtained: this.marksObtained,
    gradedBy: this.gradedBy ? this.gradedBy.toString() : null,
    gradedAt: this.gradedAt,
    updatedAt: this.updatedAt,
  };
};

export const HomeworkSubmission = mongoose.model('HomeworkSubmission', homeworkSubmissionSchema);
