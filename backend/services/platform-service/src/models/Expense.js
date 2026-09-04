import mongoose from 'mongoose';

export const EXPENSE_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'NET_BANKING', 'CHEQUE', 'DD', 'OTHER'];
export const EXPENSE_PAYMENT_STATUSES = ['PAID', 'PENDING', 'PARTIAL'];
export const EXPENSE_APPROVAL_STATUSES = ['APPROVED', 'PENDING', 'REJECTED'];

const expenseSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    expenseNumber: { type: String, required: true, trim: true, uppercase: true },

    category: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },

    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, required: true, default: Date.now },

    paymentMethod: { type: String, enum: EXPENSE_PAYMENT_METHODS, default: 'CASH' },
    paymentStatus: { type: String, enum: EXPENSE_PAYMENT_STATUSES, default: 'PAID' },
    paidAmount: { type: Number, default: 0, min: 0 },

    vendorName: { type: String, default: '', trim: true },
    reference: { type: String, default: '', trim: true },
    attachmentUrl: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },

    approvalStatus: { type: String, enum: EXPENSE_APPROVAL_STATUSES, default: 'APPROVED' },
    createdBy: { type: String, default: '', trim: true },
    approvedBy: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

expenseSchema.index({ schoolId: 1, expenseNumber: 1 }, { unique: true });
expenseSchema.index({ schoolId: 1, expenseDate: -1 });
expenseSchema.index({ schoolId: 1, category: 1 });
expenseSchema.index({ schoolId: 1, paymentStatus: 1 });

expenseSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    expenseNumber: this.expenseNumber,
    category: this.category,
    title: this.title,
    description: this.description,
    amount: this.amount,
    expenseDate: this.expenseDate,
    paymentMethod: this.paymentMethod,
    paymentStatus: this.paymentStatus,
    paidAmount: this.paidAmount,
    vendorName: this.vendorName,
    reference: this.reference,
    attachmentUrl: this.attachmentUrl,
    notes: this.notes,
    approvalStatus: this.approvalStatus,
    createdBy: this.createdBy,
    approvedBy: this.approvedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Expense = mongoose.model('Expense', expenseSchema);
