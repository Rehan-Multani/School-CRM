import mongoose from 'mongoose';

const librarySettingsSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      unique: true,
      index: true,
    },
    // Issue Rules
    maxBooksStudent: {
      type: Number,
      default: 3,
      min: 1,
    },
    maxBooksTeacher: {
      type: Number,
      default: 5,
      min: 1,
    },
    issueDaysStudent: {
      type: Number,
      default: 14,
      min: 1,
    },
    issueDaysTeacher: {
      type: Number,
      default: 30,
      min: 1,
    },

    // Fine Rules
    fineEnabled: {
      type: Boolean,
      default: true,
    },
    finePerDay: {
      type: Number,
      default: 5,
      min: 0,
    },
    maxFineAmount: {
      type: Number,
      default: 500,
      min: 0,
    },

    // Renewal Rules
    allowRenewal: {
      type: Boolean,
      default: true,
    },
    maxRenewals: {
      type: Number,
      default: 2,
      min: 0,
    },
    renewalPeriodDays: {
      type: Number,
      default: 14,
      min: 1,
    },

    // Return Rules
    gracePeriodDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    blockIssueOnOverdue: {
      type: Boolean,
      default: true,
    },

    // Lost / Damaged Charges (multiplier applied to the book's catalog price)
    lostBookFineMultiplier: {
      type: Number,
      default: 1.5,
      min: 0,
    },
    damagedBookFineMultiplier: {
      type: Number,
      default: 0.5,
      min: 0,
    },

    // Reservation Rules
    reservationEnabled: {
      type: Boolean,
      default: true,
    },
    maxActiveReservations: {
      type: Number,
      default: 2,
      min: 1,
    },

    demoDataSeeded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

librarySettingsSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    maxBooksStudent: this.maxBooksStudent ?? 3,
    maxBooksTeacher: this.maxBooksTeacher ?? 5,
    issueDaysStudent: this.issueDaysStudent ?? 14,
    issueDaysTeacher: this.issueDaysTeacher ?? 30,
    fineEnabled: this.fineEnabled ?? true,
    finePerDay: this.finePerDay ?? 5,
    maxFineAmount: this.maxFineAmount ?? 500,
    allowRenewal: this.allowRenewal ?? true,
    maxRenewals: this.maxRenewals ?? 2,
    renewalPeriodDays: this.renewalPeriodDays ?? 14,
    gracePeriodDays: this.gracePeriodDays ?? 0,
    blockIssueOnOverdue: this.blockIssueOnOverdue ?? true,
    lostBookFineMultiplier: this.lostBookFineMultiplier ?? 1.5,
    damagedBookFineMultiplier: this.damagedBookFineMultiplier ?? 0.5,
    reservationEnabled: this.reservationEnabled ?? true,
    maxActiveReservations: this.maxActiveReservations ?? 2,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const LibrarySettings = mongoose.model('LibrarySettings', librarySettingsSchema);
