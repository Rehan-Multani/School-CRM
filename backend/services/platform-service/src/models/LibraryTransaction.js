import mongoose from 'mongoose';

const libraryTransactionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LibraryIssue',
      default: null,
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
    accessionNumber: {
      type: String,
      default: '',
      trim: true,
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
    borrowerType: {
      type: String,
      enum: ['STUDENT', 'TEACHER', 'STAFF'],
      default: 'STUDENT',
    },
    borrowerCode: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['ISSUE', 'RETURN', 'RENEW', 'LOST', 'DAMAGED'],
      required: true,
      index: true,
    },
    performedBy: {
      type: String,
      default: 'Librarian',
      trim: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
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
    details: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

libraryTransactionSchema.index({ schoolId: 1, type: 1, performedAt: -1 });
libraryTransactionSchema.index({ schoolId: 1, performedAt: -1 });

libraryTransactionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    issueId: this.issueId ? this.issueId.toString() : '',
    bookId: this.bookId ? this.bookId.toString() : '',
    copyId: this.copyId ? this.copyId.toString() : '',
    bookTitle: this.bookTitle,
    accessionNumber: this.accessionNumber,
    borrowerRefId: this.borrowerRefId ? this.borrowerRefId.toString() : '',
    borrowerName: this.borrowerName,
    borrowerType: this.borrowerType,
    borrowerCode: this.borrowerCode,
    type: this.type,
    performedBy: this.performedBy,
    performedAt: this.performedAt,
    fineAmount: this.fineAmount || 0,
    fineStatus: this.fineStatus || 'NONE',
    details: this.details,
    metadata: this.metadata || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const LibraryTransaction = mongoose.model('LibraryTransaction', libraryTransactionSchema);
