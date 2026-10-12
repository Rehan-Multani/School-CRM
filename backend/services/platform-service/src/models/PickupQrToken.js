import mongoose from 'mongoose';

// One live rotating pickup QR per student. Issuing a new one REPLACES the row, so
// every earlier QR stops matching its nonce (that is what "old one is invalid"
// means); a successful scan deletes the row, so a QR is single-use. The TTL index
// cleans up expired rows — expiry itself is also checked in the token + service.
const pickupQrTokenSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    nonce: { type: String, required: true },
    issuedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

pickupQrTokenSchema.index({ studentId: 1 }, { unique: true });
pickupQrTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PickupQrToken = mongoose.model('PickupQrToken', pickupQrTokenSchema);
