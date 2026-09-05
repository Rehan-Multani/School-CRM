import mongoose from 'mongoose';

// Mandatory for webhook idempotency: Razorpay retries webhooks that don't 200
// promptly, and can occasionally deliver the same event twice regardless.
const razorpayWebhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, trim: true }, // Razorpay's x-razorpay-event-id (or a derived hash if absent)
    event: { type: String, required: true, trim: true }, // e.g. 'subscription.charged'
    payload: { type: mongoose.Schema.Types.Mixed, required: true },

    processed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date, default: null },

    failed: { type: Boolean, default: false },
    failureReason: { type: String, default: '', trim: true },
    retryCount: { type: Number, default: 0, min: 0 },
    nextRetryAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

razorpayWebhookEventSchema.index({ eventId: 1 }, { unique: true });
razorpayWebhookEventSchema.index({ processed: 1, failed: 1, nextRetryAt: 1 });
razorpayWebhookEventSchema.index({ event: 1, createdAt: -1 });

razorpayWebhookEventSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    eventId: this.eventId,
    event: this.event,
    processed: this.processed,
    processedAt: this.processedAt,
    failed: this.failed,
    failureReason: this.failureReason || '',
    retryCount: this.retryCount,
    createdAt: this.createdAt,
  };
};

export const RazorpayWebhookEvent = mongoose.model('RazorpayWebhookEvent', razorpayWebhookEventSchema);
