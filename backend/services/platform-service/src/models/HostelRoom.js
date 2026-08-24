import mongoose from 'mongoose';

const hostelRoomSchema = new mongoose.Schema(
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
    blockName: {
      type: String,
      default: 'Main Block',
      trim: true,
    },
    floorNumber: {
      type: String,
      required: true,
      default: 'Ground Floor',
      trim: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    roomType: {
      type: String,
      enum: ['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_BED', 'DORMITORY'],
      default: 'DOUBLE',
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      default: 2,
      min: 1,
    },
    monthlyRent: {
      type: Number,
      default: 0,
      min: 0,
    },
    amenities: [
      {
        type: String,
        trim: true,
      },
    ],
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'UNDER_MAINTENANCE', 'INACTIVE'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

hostelRoomSchema.index({ schoolId: 1, hostelId: 1, roomNumber: 1 }, { unique: true });
hostelRoomSchema.index({ schoolId: 1, hostelId: 1, floorNumber: 1 });

export const HostelRoom = mongoose.model('HostelRoom', hostelRoomSchema);
