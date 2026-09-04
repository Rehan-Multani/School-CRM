import mongoose from 'mongoose';

export const ANNOUNCEMENT_AUDIENCES = ['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS', 'STAFF'];
export const ANNOUNCEMENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
export const BROADCAST_CHANNELS = ['SMS', 'EMAIL', 'PUSH'];
export const BROADCAST_STATUSES = ['QUEUED', 'SENT', 'FAILED'];

const announcementSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    audiences: { type: [String], enum: ANNOUNCEMENT_AUDIENCES, default: ['ALL'] },
    publishedByName: { type: String, default: '', trim: true },
    publishAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ANNOUNCEMENT_STATUSES, default: 'DRAFT', index: true },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);
announcementSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
announcementSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    title: this.title,
    body: this.body,
    audiences: this.audiences || [],
    publishedByName: this.publishedByName || '',
    publishAt: this.publishAt,
    expiresAt: this.expiresAt,
    status: this.status,
    pinned: this.pinned,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const broadcastAlertSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    channel: { type: String, enum: BROADCAST_CHANNELS, default: 'SMS' },
    audienceLabel: { type: String, default: '', trim: true },
    content: { type: String, required: true, trim: true },
    status: { type: String, enum: BROADCAST_STATUSES, default: 'SENT' },
    sentByName: { type: String, default: '', trim: true },
    stats: {
      targeted: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
    },
    note: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);
broadcastAlertSchema.index({ schoolId: 1, createdAt: -1 });
broadcastAlertSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    channel: this.channel,
    audienceLabel: this.audienceLabel || '',
    content: this.content,
    status: this.status,
    sentByName: this.sentByName || '',
    stats: this.stats || { targeted: 0, delivered: 0 },
    note: this.note || '',
    createdAt: this.createdAt,
  };
};

const schoolMessageSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    threadKey: { type: String, required: true, trim: true, index: true },
    fromName: { type: String, default: '', trim: true },
    fromRole: { type: String, default: '', trim: true },
    direction: { type: String, enum: ['IN', 'OUT'], default: 'IN' }, // IN = from staff, OUT = admin reply
    body: { type: String, required: true, trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);
schoolMessageSchema.index({ schoolId: 1, threadKey: 1, createdAt: 1 });
schoolMessageSchema.methods.toPublicJSON = function () {
  return {
    id: this._id.toString(),
    threadKey: this.threadKey,
    fromName: this.fromName || '',
    fromRole: this.fromRole || '',
    direction: this.direction,
    body: this.body,
    readAt: this.readAt,
    createdAt: this.createdAt,
  };
};

export const Announcement = mongoose.model('Announcement', announcementSchema);
export const BroadcastAlert = mongoose.model('BroadcastAlert', broadcastAlertSchema);
export const SchoolMessage = mongoose.model('SchoolMessage', schoolMessageSchema);
