import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    authorRole: { type: String, required: true, enum: ['SuperAdmin', 'SchoolAdmin'] },
    authorName: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const supportTicketSchema = new mongoose.Schema(
  {
    ticketNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    schoolId: { type: String, required: true, trim: true, lowercase: true, index: true },
    schoolName: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['Billing', 'Technical', 'Account', 'Academic', 'Feature Request', 'Other'],
      default: 'Other',
    },
    priority: {
      type: String,
      required: true,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    status: {
      type: String,
      required: true,
      enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
      index: true,
    },
    createdByRole: { type: String, required: true, enum: ['SuperAdmin', 'SchoolAdmin'] },
    createdByName: { type: String, required: true, trim: true },
    createdByEmail: { type: String, default: '', trim: true, lowercase: true },
    assignedTo: { type: String, default: 'Support Desk', trim: true },
    messages: { type: [messageSchema], default: [] },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
  },
  { timestamps: true }
);

supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ school: 1, createdAt: -1 });

supportTicketSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    ticketNo: this.ticketNo,
    schoolId: this.schoolId,
    schoolName: this.schoolName,
    school: this.school?.toString?.() || this.school,
    subject: this.subject,
    description: this.description,
    category: this.category,
    priority: this.priority,
    status: this.status,
    createdByRole: this.createdByRole,
    createdByName: this.createdByName,
    createdByEmail: this.createdByEmail,
    assignedTo: this.assignedTo,
    messages: (this.messages || []).map((message) => ({
      id: message._id.toString(),
      authorRole: message.authorRole,
      authorName: message.authorName,
      body: message.body,
      createdAt: message.createdAt,
    })),
    resolvedAt: this.resolvedAt,
    resolvedBy: this.resolvedBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
