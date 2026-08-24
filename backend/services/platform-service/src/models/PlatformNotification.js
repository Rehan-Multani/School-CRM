import mongoose from 'mongoose';
import { DEVICE_ROLES } from './DeviceToken.js';

const platformNotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    audiences: [{ type: String, enum: DEVICE_ROLES, required: true }],
    // Empty = broadcast to everyone matching `audiences` + `schoolId` (existing behavior).
    // Non-empty = only visible to these specific user ids (targeted delivery).
    recipientRefIds: [{ type: String, default: [] }],
    schoolId: { type: String, default: '', trim: true },
    schoolName: { type: String, default: '', trim: true },
    createdBy: { type: String, default: null },
    delivery: {
      firebaseConfigured: { type: Boolean, default: false },
      attempted: { type: Number, default: 0 },
      success: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      skippedReason: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

platformNotificationSchema.index({ createdAt: -1 });
platformNotificationSchema.index({ audiences: 1, createdAt: -1 });

platformNotificationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    title: this.title,
    body: this.body,
    audiences: this.audiences || [],
    recipientRefIds: this.recipientRefIds || [],
    schoolId: this.schoolId || '',
    schoolName: this.schoolName || '',
    createdBy: this.createdBy,
    delivery: {
      firebaseConfigured: Boolean(this.delivery?.firebaseConfigured),
      attempted: this.delivery?.attempted || 0,
      success: this.delivery?.success || 0,
      failed: this.delivery?.failed || 0,
      skippedReason: this.delivery?.skippedReason || '',
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const PlatformNotification = mongoose.model('PlatformNotification', platformNotificationSchema);
