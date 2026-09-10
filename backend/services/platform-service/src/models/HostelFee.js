import mongoose from 'mongoose';

/**
 * Step 6 of the hostel flow — the school's yearly hostel fee, one amount per
 * academic year (2026-27 → ₹60,000, 2027-28 → ₹65,000).
 *
 * Deliberately NOT per class, per hostel or per room type: every resident of a
 * given year pays the same. A resident's own payable amount is snapshotted onto
 * their allocation, so revising a year here never re-prices anyone already in.
 */
const hostelFeeSchema = new mongoose.Schema(
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
hostelFeeSchema.index({ schoolId: 1, academicYearId: 1 }, { unique: true });

export const HostelFee = mongoose.model('HostelFee', hostelFeeSchema);
