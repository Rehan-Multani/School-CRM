import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    schoolName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      maxlength: 30,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Contacted'],
      default: 'Pending',
      index: true,
    },
    contactedAt: {
      type: Date,
      default: null,
    },
    contactedBy: {
      type: String,
      default: null,
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

enquirySchema.index({ createdAt: -1 });
enquirySchema.index({ status: 1, createdAt: -1 });

enquirySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    schoolName: this.schoolName,
    phone: this.phone,
    message: this.message,
    status: this.status,
    contactedAt: this.contactedAt,
    contactedBy: this.contactedBy,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Enquiry = mongoose.model('Enquiry', enquirySchema);
