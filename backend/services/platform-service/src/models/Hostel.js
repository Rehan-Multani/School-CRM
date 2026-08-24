import mongoose from 'mongoose';

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
    type: {
      type: String,
      enum: ['BOYS', 'GIRLS', 'CO_ED', 'STAFF'],
      required: true,
      default: 'BOYS',
    },
    wardenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
    assistantWardenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
    contactNumber: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      addressLine: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    totalBlocks: {
      type: Number,
      default: 1,
      min: 1,
    },
    totalFloors: {
      type: Number,
      default: 1,
      min: 1,
    },
    capacity: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'],
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

hostelSchema.index({ schoolId: 1, name: 1 });
hostelSchema.index({ schoolId: 1, type: 1 });

export const Hostel = mongoose.model('Hostel', hostelSchema);
