import mongoose from 'mongoose';

export const ASSIGNMENT_STATUSES = ['ACTIVE', 'DISCONTINUED'];

/**
 * Step 5 of the transport flow — student → route → stop.
 *
 * Only the stop is stored. Pickup and drop TIMES are never copied here: they are
 * read live from the RouteStop, so editing a stop's schedule instantly updates
 * every student riding from it (which is exactly what "the student's pickup/drop
 * time comes from the selected route stop" means).
 */
const studentTransportAssignmentSchema = new mongoose.Schema(
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
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportRoute',
      required: true,
      index: true,
    },
    stopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RouteStop',
      required: true,
      index: true,
    },
    // The year this rider belongs to, and what transport cost that year.
    //
    // `yearlyFeeAmount` is a SNAPSHOT of the TransportFee taken when the student
    // was assigned — editing a year's fee later never silently re-prices anyone
    // already riding. Nullable only so rows written before the fee existed still
    // load; the service requires a year on every new assignment.
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      default: null,
      index: true,
    },
    yearlyFeeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

// A student rides exactly one route at a time. Discontinued rows are excluded so
// a student can be re-assigned later without tripping the constraint.
studentTransportAssignmentSchema.index(
  { schoolId: 1, studentId: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);
studentTransportAssignmentSchema.index({ schoolId: 1, routeId: 1, status: 1 });
studentTransportAssignmentSchema.index({ schoolId: 1, stopId: 1, status: 1 });

export const StudentTransportAssignment = mongoose.model(
  'StudentTransportAssignment',
  studentTransportAssignmentSchema
);
