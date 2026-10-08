import mongoose from 'mongoose';

/**
 * Per-school atomic sequence counters for document numbers (receipts,
 * invoices, expenses). `countDocuments()+1` was used before: two concurrent
 * collections produced the same number and a deleted record reused one.
 * A single `$inc` upsert is atomic, so every call gets a distinct number.
 */
const counterSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    key: { type: String, required: true, trim: true }, // e.g. "receipt-2026"
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

counterSchema.index({ schoolId: 1, key: 1 }, { unique: true });

export const Counter = mongoose.model('Counter', counterSchema);

const toId = (v) => new mongoose.Types.ObjectId(String(v));

/**
 * Returns the next sequence value for (schoolId, key).
 * `seedFrom` (optional, async) is called only when the counter is brand new,
 * so a school that already has count-based numbers continues after its
 * highest existing one instead of colliding with it.
 */
export async function nextSequence(schoolId, key, seedFrom) {
  const sid = toId(schoolId);
  const existing = await Counter.findOne({ schoolId: sid, key }).select('_id').lean();
  if (!existing && typeof seedFrom === 'function') {
    let start = 0;
    try {
      start = Number(await seedFrom()) || 0;
    } catch {
      start = 0;
    }
    // Create at the seeded value; a concurrent creator loses on the unique
    // index and simply falls through to the $inc below.
    await Counter.create({ schoolId: sid, key, seq: start }).catch((err) => {
      if (err?.code !== 11000) throw err;
    });
  }
  const doc = await Counter.findOneAndUpdate(
    { schoolId: sid, key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();
  return doc.seq;
}

/**
 * Highest numeric suffix among existing documents whose number looks like
 * `${prefix}-${year}-NNNNN`. Used as the seed for a brand-new counter.
 */
export async function maxNumericSuffix(Model, schoolId, field, prefix) {
  const rows = await Model.find({ schoolId: toId(schoolId), [field]: { $regex: `^${prefix}-` } })
    .select(field)
    .lean();
  let max = 0;
  for (const r of rows) {
    const m = String(r[field] || '').match(/(\d+)\s*$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}
