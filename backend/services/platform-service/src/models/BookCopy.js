import mongoose from 'mongoose';

const bookCopySchema = new mongoose.Schema(
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
    accessionNumber: {
      type: String,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'ISSUED', 'RESERVED', 'LOST', 'DAMAGED', 'MAINTENANCE'],
      default: 'AVAILABLE',
      index: true,
    },
    condition: {
      type: String,
      enum: ['NEW', 'GOOD', 'FAIR', 'POOR'],
      default: 'GOOD',
    },
    rackNumber: {
      type: String,
      default: '',
      trim: true,
    },
    shelfNumber: {
      type: String,
      default: '',
      trim: true,
    },
    acquiredAt: {
      type: Date,
      default: Date.now,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    remarks: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

bookCopySchema.index({ schoolId: 1, accessionNumber: 1 }, { unique: true });
bookCopySchema.index({ schoolId: 1, bookId: 1, status: 1 });
bookCopySchema.index({ schoolId: 1, barcode: 1 });

bookCopySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    bookId: this.bookId ? (this.bookId._id ? this.bookId._id.toString() : this.bookId.toString()) : '',
    bookTitle: this.bookId?.title || '',
    bookAuthor: this.bookId?.author || '',
    bookCategory: this.bookId?.category || '',
    accessionNumber: this.accessionNumber,
    barcode: this.barcode || this.accessionNumber,
    status: this.status,
    condition: this.condition,
    rackNumber: this.rackNumber,
    shelfNumber: this.shelfNumber,
    acquiredAt: this.acquiredAt,
    price: this.price || 0,
    remarks: this.remarks || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const BookCopy = mongoose.model('BookCopy', bookCopySchema);
