import mongoose from 'mongoose';

/**
 * Step 2 of the hostel flow — a room inside one hostel.
 *
 * `capacity` is the single source of truth for how many beds the room has: the
 * service creates exactly that many HostelBed rows and keeps them in step when
 * the capacity is edited. Rent, amenities and maintenance state are out of
 * scope for this module.
 */
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
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    // Free text, as the school says it — "1st Floor", "Ground Floor".
    floorNumber: {
      type: String,
      required: true,
      trim: true,
      default: 'Ground Floor',
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
    },
  },
  { timestamps: true }
);

// Room 101 exists once per hostel — the duplicate-room rule.
hostelRoomSchema.index({ schoolId: 1, hostelId: 1, roomNumber: 1 }, { unique: true });

hostelRoomSchema.methods.toPublicJSON = function toPublicJSON() {
  const hostel = this.populated('hostelId') ? this.hostelId : null;
  return {
    id: this._id.toString(),
    hostelId: this.hostelId ? String(this.hostelId._id || this.hostelId) : null,
    hostel: hostel ? { id: hostel._id.toString(), name: hostel.name, type: hostel.type } : null,
    roomNumber: this.roomNumber,
    floorNumber: this.floorNumber,
    capacity: this.capacity,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const HostelRoom = mongoose.model('HostelRoom', hostelRoomSchema);
