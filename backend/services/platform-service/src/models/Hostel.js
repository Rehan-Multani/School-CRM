import mongoose from 'mongoose';

export const HOSTEL_TYPES = ['BOYS', 'GIRLS', 'CO_ED'];
export const HOSTEL_CATEGORIES = ['RESIDENTIAL', 'DAY_BOARDING'];
export const HOSTEL_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * Step 1 of the hostel flow — the building itself.
 *
 * Deliberately minimal: what the hostel IS (name, code, who it houses), how to
 * reach it, and how many students may live in it. Mess plans, inventory and
 * every other facility concern stay out of this module.
 */
const hostelSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    // The admin's own short handle for the building — "BH-01". Unique per school.
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: HOSTEL_TYPES,
      default: 'BOYS',
      required: true,
    },
    // Optional: how the building is run. Null when the school does not care.
    category: {
      type: String,
      enum: [...HOSTEL_CATEGORIES, null],
      default: null,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    // Declared on paper. `totalRooms` is what the admin says the building has;
    // the rooms actually created in step 2 are counted separately at read time.
    totalFloors: {
      type: Number,
      min: 1,
      max: 50,
      default: null,
    },
    totalRooms: {
      type: Number,
      min: 1,
      max: 500,
      default: null,
    },
    // The building's own ceiling. Its rooms may add up to fewer beds than this,
    // but the number of residents can never exceed it.
    totalCapacity: {
      type: Number,
      required: true,
      min: 1,
      max: 2000,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: HOSTEL_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

// One hostel name per school — the anti-duplicate anchor for step 1.
hostelSchema.index({ schoolId: 1, name: 1 }, { unique: true });
// ...and one code, the handle the admin actually types on paper.
hostelSchema.index({ schoolId: 1, code: 1 }, { unique: true });

hostelSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    code: this.code,
    type: this.type,
    category: this.category || '',
    contactNumber: this.contactNumber || '',
    address: this.address || '',
    totalFloors: this.totalFloors ?? null,
    totalRooms: this.totalRooms ?? null,
    totalCapacity: this.totalCapacity,
    description: this.description || '',
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Hostel = mongoose.model('Hostel', hostelSchema);
