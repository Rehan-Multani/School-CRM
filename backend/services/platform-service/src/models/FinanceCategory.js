import mongoose from 'mongoose';

export const FINANCE_CATEGORY_TYPES = ['INCOME', 'EXPENSE'];
export const FINANCE_CATEGORY_STATUSES = ['ACTIVE', 'INACTIVE'];

/**
 * Finance Category — categories for income and expense transactions.
 *
 * Examples:
 * - Income: Fee Collection, Admission Fee, Transport Collection, Other Income
 * - Expense: Salary, Electricity, Maintenance, Stationery, Transport, Hostel, Other Expense
 */
const financeCategorySchema = new mongoose.Schema(
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
      maxlength: 100,
    },
    type: {
      type: String,
      enum: FINANCE_CATEGORY_TYPES,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    status: {
      type: String,
      enum: FINANCE_CATEGORY_STATUSES,
      default: 'ACTIVE',
      index: true,
    },
  },
  { timestamps: true }
);

// Unique name + type per school
financeCategorySchema.index({ schoolId: 1, name: 1, type: 1 }, { unique: true });

financeCategorySchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    type: this.type,
    description: this.description,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const FinanceCategory = mongoose.model('FinanceCategory', financeCategorySchema);
