import mongoose from 'mongoose';

// A person who walked into the school for an enquiry. Recorded by HR; School Admin
// and Principal only read the list. Deliberately minimal — basic details only.
const visitorSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    mobile: { type: String, required: true, trim: true, maxlength: 20 },
    purpose: { type: String, required: true, trim: true, maxlength: 300 },
    personToMeet: { type: String, default: '', trim: true, maxlength: 120 },
    visitDate: { type: Date, required: true, default: Date.now },
    remarks: { type: String, default: '', trim: true, maxlength: 500 },
    createdBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

visitorSchema.index({ schoolId: 1, visitDate: -1 });

visitorSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    mobile: this.mobile,
    purpose: this.purpose,
    personToMeet: this.personToMeet || '',
    visitDate: this.visitDate,
    remarks: this.remarks || '',
    createdBy: this.createdBy || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Visitor = mongoose.model('Visitor', visitorSchema);
