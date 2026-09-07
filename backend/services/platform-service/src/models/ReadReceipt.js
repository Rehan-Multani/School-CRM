import mongoose from 'mongoose';

/**
 * Per-user read state for things that have no built-in read tracking
 * (PlatformNotification, Announcement). One row = "this user has read this item".
 */
const readReceiptSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    userId: { type: String, required: true }, // Teacher._id as string
    userType: { type: String, default: 'TEACHER' },
    refType: { type: String, enum: ['NOTIFICATION', 'ANNOUNCEMENT'], required: true },
    refId: { type: String, required: true },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

readReceiptSchema.index({ userId: 1, refType: 1, refId: 1 }, { unique: true });
readReceiptSchema.index({ userId: 1, refType: 1, readAt: -1 });

export const ReadReceipt = mongoose.model('ReadReceipt', readReceiptSchema);
