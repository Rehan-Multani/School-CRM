import mongoose from 'mongoose';

export const BED_STATUSES = ['AVAILABLE', 'OCCUPIED'];

/**
 * Step 3 of the hostel flow — the beds in a room.
 *
 * Beds are never created by hand: the room's capacity defines them ("Bed 1" …
 * "Bed 4"), and `status` is maintained by the allocation service — OCCUPIED the
 * moment a student takes the bed, AVAILABLE again when they vacate.
 */
const hostelBedSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
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
    bedCode: {
      type: String,
      required: true,
      trim: true,
    },
    // Position within the room, 1-based — what "Bed 3" means numerically, and
    // what makes shrinking a room's capacity drop beds from the end.
    bedNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: BED_STATUSES,
      default: 'AVAILABLE',
      index: true,
    },
    currentStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
    currentAllocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelAllocation',
      default: null,
    },
  },
  { timestamps: true }
);

hostelBedSchema.index({ schoolId: 1, roomId: 1, bedCode: 1 }, { unique: true });
hostelBedSchema.index({ schoolId: 1, hostelId: 1, status: 1 });

hostelBedSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    hostelId: String(this.hostelId),
    roomId: String(this.roomId),
    bedCode: this.bedCode,
    bedNumber: this.bedNumber,
    status: this.status,
    currentStudentId: this.currentStudentId ? String(this.currentStudentId) : null,
  };
};

export const HostelBed = mongoose.model('HostelBed', hostelBedSchema);
