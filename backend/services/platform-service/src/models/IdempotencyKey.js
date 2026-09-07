import mongoose from 'mongoose';

/**
 * Replay cache for retry-sensitive teacher mutations (attendance & marks bulk
 * submit). The client sends a stable `Idempotency-Key` header; the first request
 * runs the handler and stores its response, later retries replay it verbatim.
 * Rows self-expire after 24h.
 */
const idempotencyKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    scope: { type: String, required: true, trim: true }, // e.g. 'attendance.submit'
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    statusCode: { type: Number, default: 200 },
    responseBody: { type: mongoose.Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
  },
  { timestamps: false }
);

// One key per (teacher, scope) — the same key reused for a different scope is
// still distinct, which is intentional.
idempotencyKeySchema.index({ teacherId: 1, scope: 1, key: 1 }, { unique: true });

export const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);
