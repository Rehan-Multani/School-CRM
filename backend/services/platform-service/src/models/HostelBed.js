import mongoose from 'mongoose';

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
    status: {
      type: String,
      enum: ['AVAILABLE', 'OCCUPIED', 'UNDER_MAINTENANCE'],
      default: 'AVAILABLE',
      index: true,
    },
    currentAllocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HostelAllocation',
      default: null,
    },
    currentStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      default: null,
    },
  },
  { timestamps: true }
);

hostelBedSchema.index({ schoolId: 1, roomId: 1, bedCode: 1 }, { unique: true });
hostelBedSchema.index({ schoolId: 1, hostelId: 1, status: 1 });

export const HostelBed = mongoose.model('HostelBed', hostelBedSchema);
