import mongoose from 'mongoose';

export const FEE_INVOICE_STATUSES = ['DRAFT', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'];

const feeInvoiceItemSchema = new mongoose.Schema(
  {
    feeAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentFeeAssignment' },
    feeHeadName: { type: String, required: true },
    originalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
  },
  { _id: false }
);

const feeInvoiceSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentEnrollment', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    invoiceNumber: { type: String, required: true, trim: true, uppercase: true },

    periodLabel: { type: String, required: true, trim: true }, // e.g. "April 2026" or "Annual 2026-27"
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },

    items: [feeInvoiceItemSchema],

    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: FEE_INVOICE_STATUSES,
      default: 'PENDING',
    },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

feeInvoiceSchema.index({ schoolId: 1, invoiceNumber: 1 }, { unique: true });
feeInvoiceSchema.index({ schoolId: 1, studentId: 1, periodLabel: 1 });
feeInvoiceSchema.index({ schoolId: 1, status: 1, dueDate: 1 });

feeInvoiceSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    studentId: this.studentId.toString(),
    enrollmentId: this.enrollmentId.toString(),
    academicYearId: this.academicYearId.toString(),
    invoiceNumber: this.invoiceNumber,
    periodLabel: this.periodLabel,
    periodStart: this.periodStart,
    periodEnd: this.periodEnd,
    dueDate: this.dueDate,
    items: this.items,
    totalAmount: this.totalAmount,
    paidAmount: this.paidAmount,
    balanceAmount: this.balanceAmount,
    status: this.status,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FeeInvoice = mongoose.model('FeeInvoice', feeInvoiceSchema);
