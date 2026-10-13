import mongoose from 'mongoose';

// A school's student-enquiry form: the built-in fields (switch on/off, make required,
// rename) plus any custom fields the school adds. One document per school.
const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true, maxlength: 60 },
    label: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ['text', 'textarea', 'number', 'date', 'select', 'email', 'phone'], default: 'text' },
    required: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
    options: [{ type: String, trim: true, maxlength: 80 }],
    builtIn: { type: Boolean, default: false },
  },
  { _id: false }
);

const enquiryFormConfigSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, unique: true },
    enabled: { type: Boolean, default: true },
    title: { type: String, default: 'Student Enquiry', trim: true, maxlength: 120 },
    intro: { type: String, default: '', trim: true, maxlength: 500 },
    successMessage: { type: String, default: '', trim: true, maxlength: 300 },
    fields: [fieldSchema],
  },
  { timestamps: true }
);

export const EnquiryFormConfig = mongoose.model('EnquiryFormConfig', enquiryFormConfigSchema);
