import mongoose from 'mongoose';

const libraryReservationSchema = new mongoose.Schema(
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
    },
    borrowerRefId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    borrowerType: {
      type: String,
      enum: ['STUDENT', 'TEACHER', 'STAFF'],
      required: true,
      default: 'STUDENT',
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
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'FULFILLED'],
      default: 'PENDING',
      index: true,
    },
    reservedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days reservation validity
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: String,
      default: 'Librarian',
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

libraryReservationSchema.index({ schoolId: 1, status: 1 });
libraryReservationSchema.index({ schoolId: 1, bookId: 1, status: 1 });
libraryReservationSchema.index({ schoolId: 1, borrowerRefId: 1, status: 1 });
// Enforces "no duplicate pending reservation" at the DB level, closing the race window
// where two concurrent requests could both pass an application-level duplicate check.
libraryReservationSchema.index(
  { schoolId: 1, bookId: 1, borrowerRefId: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

libraryReservationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    bookId: this.bookId ? (this.bookId._id ? this.bookId._id.toString() : this.bookId.toString()) : '',
    copyId: this.copyId ? this.copyId.toString() : '',
    bookTitle: this.bookId?.title || '',
    bookAuthor: this.bookId?.author || '',
    bookCategory: this.bookId?.category || '',
    borrowerRefId: this.borrowerRefId ? this.borrowerRefId.toString() : '',
    borrowerType: this.borrowerType,
    borrowerName: this.borrowerName,
    borrowerCode: this.borrowerCode,
    borrowerClass: this.borrowerClass,
    status: this.status,
    reservedAt: this.reservedAt,
    expiresAt: this.expiresAt,
    approvedAt: this.approvedAt,
    fulfilledAt: this.fulfilledAt,
    cancelledAt: this.cancelledAt,
    createdBy: this.createdBy,
    remarks: this.remarks || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const LibraryReservation = mongoose.model('LibraryReservation', libraryReservationSchema);
