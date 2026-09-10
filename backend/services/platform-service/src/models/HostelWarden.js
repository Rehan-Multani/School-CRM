import mongoose from 'mongoose';

export const WARDEN_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * Step 4 of the hostel flow — the person responsible for a hostel.
 *
 * A warden is its own record, not a SchoolUser: this module needs a name and a
 * contact number, not a login. `hostelId` is null until the admin assigns them,
 * and a hostel holds at most one warden.
 */
const hostelWardenSchema = new mongoose.Schema(
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
    mobile: {
      type: String,
      required: true,
      trim: true,
    },
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      default: null,
    },
    status: {
      type: String,
      enum: WARDEN_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

hostelWardenSchema.index({ schoolId: 1, mobile: 1 }, { unique: true });
// One warden per hostel — enforced in the service; this index makes the check cheap.
hostelWardenSchema.index({ schoolId: 1, hostelId: 1 });

hostelWardenSchema.methods.toPublicJSON = function toPublicJSON() {
  const hostel = this.populated('hostelId') ? this.hostelId : null;
  return {
    id: this._id.toString(),
    name: this.name,
    mobile: this.mobile,
    hostelId: this.hostelId ? String(this.hostelId._id || this.hostelId) : null,
    hostel: hostel ? { id: hostel._id.toString(), name: hostel.name, type: hostel.type } : null,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const HostelWarden = mongoose.model('HostelWarden', hostelWardenSchema);
