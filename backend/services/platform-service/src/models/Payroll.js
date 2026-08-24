import mongoose from 'mongoose';

const bankDetailsSchema = new mongoose.Schema(
  {
    accountName: { type: String, default: '', trim: true },
    accountNumber: { type: String, default: '', trim: true },
    ifscCode: { type: String, default: '', trim: true, uppercase: true },
    bankName: { type: String, default: '', trim: true },
    branchName: { type: String, default: '', trim: true },
    accountType: { type: String, default: 'SALARY', trim: true },
  },
  { _id: false }
);

const payrollSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    employeeRefId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    employeeType: {
      type: String,
      enum: ['TEACHER', 'STAFF'],
      required: true,
      default: 'STAFF',
    },
    employeeId: { type: String, required: true, trim: true },
    employeeName: { type: String, required: true, trim: true },
    employeeEmail: { type: String, default: '', trim: true, lowercase: true },
    employeeRole: { type: String, required: true, trim: true },
    department: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true },

    // Payroll Period
    payrollMonth: { type: String, required: true, trim: true, index: true }, // e.g. 'August 2026' or '2026-08'
    payrollDate: { type: Date, default: Date.now },

    // Earnings
    basicSalary: { type: Number, required: true, default: 0, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    incentive: { type: Number, default: 0, min: 0 },
    overtime: { type: Number, default: 0, min: 0 },
    bonus: { type: Number, default: 0, min: 0 },
    grossEarnings: { type: Number, default: 0, min: 0 },

    // Deductions
    leaveDeduction: { type: Number, default: 0, min: 0 },
    otherDeduction: { type: Number, default: 0, min: 0 },
    advanceLoanDeduction: { type: Number, default: 0, min: 0 },
    totalDeductions: { type: Number, default: 0, min: 0 },

    // Net Result
    netSalary: { type: Number, required: true, default: 0, min: 0 },

    // Status & Method
    paymentStatus: {
      type: String,
      enum: ['PROCESSED', 'PAID', 'ON_HOLD', 'CANCELLED'],
      default: 'PROCESSED',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH', 'UPI'],
      default: 'BANK_TRANSFER',
    },
    paymentDate: { type: Date, default: null },
    transactionRef: { type: String, default: '', trim: true },
    remarks: { type: String, default: '', trim: true },

    // Snapshot of banking details at time of payroll creation
    bankDetails: {
      type: bankDetailsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

payrollSchema.index({ schoolId: 1, employeeRefId: 1, payrollMonth: 1 });
payrollSchema.index({ schoolId: 1, payrollMonth: 1, paymentStatus: 1 });

payrollSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    employeeRefId: this.employeeRefId.toString(),
    employeeType: this.employeeType,
    employeeId: this.employeeId,
    employeeName: this.employeeName,
    employeeEmail: this.employeeEmail,
    employeeRole: this.employeeRole,
    department: this.department,
    designation: this.designation,
    payrollMonth: this.payrollMonth,
    payrollDate: this.payrollDate,
    basicSalary: this.basicSalary,
    allowances: this.allowances,
    incentive: this.incentive,
    overtime: this.overtime,
    bonus: this.bonus,
    grossEarnings: this.grossEarnings,
    leaveDeduction: this.leaveDeduction,
    otherDeduction: this.otherDeduction,
    advanceLoanDeduction: this.advanceLoanDeduction,
    totalDeductions: this.totalDeductions,
    netSalary: this.netSalary,
    paymentStatus: this.paymentStatus,
    paymentMethod: this.paymentMethod,
    paymentDate: this.paymentDate,
    transactionRef: this.transactionRef,
    remarks: this.remarks,
    bankDetails: this.bankDetails || {},
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Payroll = mongoose.model('Payroll', payrollSchema);
