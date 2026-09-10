import mongoose from 'mongoose';

export const ALLOCATION_STATUSES = ['ACTIVE', 'VACATED'];

/**
 * Step 5 of the hostel flow — student → hostel → room → bed, for one academic
 * year.
 *
 * `yearlyFeeAmount` is a SNAPSHOT of the HostelFee for `academicYearId`, taken
 * when the student was assigned. Editing a future year's fee therefore cannot
 * reach back and change what an existing resident owes.
 */
const hostelAllocationSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelRoom',
      required: true,
      index: true,
    },
    bedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelBed',
      required: true,
      index: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
      index: true,
    },
    yearlyFeeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ALLOCATION_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

// A student lives in exactly one bed at a time, and a bed holds exactly one
// student. Vacated rows are excluded so both can be re-used later.
hostelAllocationSchema.index(
  { schoolId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);
hostelAllocationSchema.index(
  { schoolId: 1, bedId: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);
hostelAllocationSchema.index({ schoolId: 1, hostelId: 1, status: 1 });

export const HostelAllocation = mongoose.model('HostelAllocation', hostelAllocationSchema);
