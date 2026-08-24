import mongoose from 'mongoose';

const libraryBookSchema = new mongoose.Schema(
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
    author: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      default: '',
      trim: true,
    },
    bookCode: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'GENERAL',
    },
    subject: {
      type: String,
      default: '',
      trim: true,
    },
    publisher: {
      type: String,
      default: '',
      trim: true,
    },
    edition: {
      type: String,
      default: '',
      trim: true,
    },
    publicationYear: {
      type: Number,
      default: null,
    },
    language: {
      type: String,
      default: 'English',
      trim: true,
    },
    pages: {
      type: Number,
      default: 0,
      min: 0,
    },
    coverImage: {
      type: String,
      default: '',
      trim: true,
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
    totalCopies: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    availableCopies: {
      type: Number,
      required: true,
      default: 1,
      min: 0,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'OUT_OF_STOCK', 'ARCHIVED'],
      default: 'AVAILABLE',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

libraryBookSchema.index({ schoolId: 1, title: 1 });
libraryBookSchema.index({ schoolId: 1, category: 1 });
libraryBookSchema.index({ schoolId: 1, author: 1 });
libraryBookSchema.index({ schoolId: 1, publisher: 1 });
libraryBookSchema.index({ schoolId: 1, isbn: 1 });

libraryBookSchema.methods.toPublicJSON = function toPublicJSON(extraStats = null) {
  const totalCopies = extraStats?.totalCopies !== undefined ? extraStats.totalCopies : this.totalCopies;
  const availableCopies = extraStats?.availableCopies !== undefined ? extraStats.availableCopies : this.availableCopies;

  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    title: this.title,
    author: this.author,
    isbn: this.isbn,
    bookCode: this.bookCode || `BK-${this._id.toString().slice(-4).toUpperCase()}`,
    category: this.category,
    subject: this.subject || '',
    publisher: this.publisher,
    edition: this.edition,
    publicationYear: this.publicationYear,
    language: this.language || 'English',
    pages: this.pages || 0,
    coverImage: this.coverImage || '',
    rackNumber: this.rackNumber,
    shelfNumber: this.shelfNumber,
    totalCopies,
    availableCopies,
    issuedCopies: Math.max(0, totalCopies - availableCopies),
    price: this.price,
    description: this.description,
    status: availableCopies > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
    isActive: this.isActive !== false,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const LibraryBook = mongoose.model('LibraryBook', libraryBookSchema);
