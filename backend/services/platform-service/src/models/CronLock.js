import mongoose from 'mongoose';

// Distributed lock for cron jobs when more than one platform-service instance
// is running. A job claims the lock document via an atomic operation before
// running, and releases it when done (or lets it expire via lockedUntil).
const cronLockSchema = new mongoose.Schema({
  jobName: { type: String, required: true, unique: true },
  lockedAt: { type: Date, required: true },
  lockedUntil: { type: Date, required: true },
  holder: { type: String, default: '' }, // hostname:pid, for observability only
});

export const CronLock = mongoose.model('CronLock', cronLockSchema);

/**
 * Try to atomically claim `jobName` for `ttlMs` milliseconds.
 * Returns true if the caller now holds the lock, false if another instance does
 * (or holds it and it hasn't expired yet).
 */
export async function acquireCronLock(jobName, ttlMs, holder) {
  const now = new Date();
  const until = new Date(now.getTime() + ttlMs);

  // Case 1: a lock document exists and has expired (or has no expiry yet) -> claim it.
  const claimed = await CronLock.findOneAndUpdate(
    { jobName, lockedUntil: { $lte: now } },
    { $set: { lockedAt: now, lockedUntil: until, holder } },
    { new: true }
  );
  if (claimed) return true;

  // Case 2: no document exists yet -> create it. If another instance races us
  // here, the unique index on jobName rejects the loser with E11000.
  try {
    await CronLock.create({ jobName, lockedAt: now, lockedUntil: until, holder });
    return true;
  } catch (err) {
    if (err?.code === 11000) return false; // someone else holds (or just created) the lock
    throw err;
  }
}

export async function releaseCronLock(jobName) {
  await CronLock.updateOne({ jobName }, { $set: { lockedUntil: new Date(0) } });
}
