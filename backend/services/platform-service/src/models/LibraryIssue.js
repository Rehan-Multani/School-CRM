import mongoose from 'mongoose';

const libraryIssueSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LibraryBook',
      required: true,
      index: true,
    },
    copyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookCopy',
      default: null,
      index: true,
    },
    bookTitle: {
      type: String,
      required: true,
      trim: true,
    },
    bookCode: {
      type: String,
      default: '',
      trim: true,
    },
    accessionNumber: {
      type: String,
      default: '',
      trim: true,
    },
    borrowerType: {
      type: String,
      enum: ['STUDENT', 'TEACHER', 'STAFF'],
      required: true,
      default: 'STUDENT',
    },
    borrowerRefId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    borrowerName: {
      type: String,
      required: true,
      trim: true,
    },
    borrowerCode: {
      type: String,
      default: '',
      trim: true,
    },
    borrowerClass: {
      type: String,
      default: '',
      trim: true,
    },
    issueDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      default: null,
    },
    renewalCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRenewals: {
      type: Number,
      default: 2,
      min: 0,
    },
    renewedAt: {
      type: Date,
      default: null,
    },
    lastRenewedBy: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ISSUED', 'RETURNED', 'OVERDUE', 'LOST'],
      default: 'ISSUED',
      index: true,
    },
    fineAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    fineStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'PAID', 'WAIVED'],
      default: 'NONE',
    },
    conditionOnReturn: {
      type: String,
      enum: ['GOOD', 'DAMAGED', 'LOST', 'NONE'],
      default: 'NONE',
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

libraryIssueSchema.index({ schoolId: 1, status: 1 });
libraryIssueSchema.index({ schoolId: 1, borrowerRefId: 1, status: 1 });
libraryIssueSchema.index({ schoolId: 1, dueDate: 1 });
libraryIssueSchema.index({ schoolId: 1, copyId: 1 });

libraryIssueSchema.methods.toPublicJSON = function toPublicJSON() {
  const now = new Date();
  let currentStatus = this.status;
  if (currentStatus === 'ISSUED' && this.dueDate && new Date(this.dueDate) < now) {
    currentStatus = 'OVERDUE';
  }

  // Calculate overdue days
  let overdueDays = 0;
  if (currentStatus === 'OVERDUE' || (this.returnDate && new Date(this.returnDate) > new Date(this.dueDate))) {
    const end = this.returnDate ? new Date(this.returnDate) : now;
    const diffTime = Math.max(0, end - new Date(this.dueDate));
    overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    bookId: this.bookId ? (this.bookId._id ? this.bookId._id.toString() : this.bookId.toString()) : '',
    copyId: this.copyId ? (this.copyId._id ? this.copyId._id.toString() : this.copyId.toString()) : '',
    bookTitle: this.bookTitle,
    bookCode: this.bookCode,
    accessionNumber: this.accessionNumber || '',
    borrowerType: this.borrowerType,
    borrowerRefId: this.borrowerRefId ? this.borrowerRefId.toString() : '',
    borrowerName: this.borrowerName,
    borrowerCode: this.borrowerCode,
    borrowerClass: this.borrowerClass,
    issueDate: this.issueDate,
    dueDate: this.dueDate,
    returnDate: this.returnDate,
    renewalCount: this.renewalCount || 0,
    maxRenewals: this.maxRenewals || 2,
    canRenew: (this.renewalCount || 0) < (this.maxRenewals || 2) && currentStatus === 'ISSUED',
    renewedAt: this.renewedAt,
    lastRenewedBy: this.lastRenewedBy,
    status: currentStatus,
    overdueDays,
    fineAmount: this.fineAmount || 0,
    fineStatus: this.fineStatus || 'NONE',
    conditionOnReturn: this.conditionOnReturn,
    remarks: this.remarks || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const LibraryIssue = mongoose.model('LibraryIssue', libraryIssueSchema);
