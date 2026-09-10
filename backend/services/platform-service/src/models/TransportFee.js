import mongoose from 'mongoose';

/**
 * The school's yearly transport fee, one amount per academic year.
 *
 * Deliberately NOT per class, per route or per stop: the school charges every
 * rider the same amount for a given year, and the year is what makes 2026-27's
 * ₹12,000 a different record from 2027-28's ₹14,000.
 *
 * A rider's own payable amount is snapshotted onto their assignment when they
 * are assigned, so editing a future year here never rewrites past enrolments.
 */
const transportFeeSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    yearlyAmount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

// One amount per school per year — the whole point of the model.
transportFeeSchema.index({ schoolId: 1, academicYearId: 1 }, { unique: true });

export const TransportFee = mongoose.model('TransportFee', transportFeeSchema);
