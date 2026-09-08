import rateLimit from 'express-rate-limit';

/**
 * Process-local throttles for the abuse-prone Transport APK mutations. No Redis
 * in this deployment — the correctness-critical guards are in the DB (unique
 * indexes, trip state machine). `skip` in test for deterministic suites.
 */
const common = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
};

// GPS pings: ~1/sec is plenty for a bus; allow a burst.
export const gpsRateLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 120,
  message: { success: false, message: 'Location updates are coming in too fast.', code: 'RATE_LIMITED' },
});

// SOS: soft cap so an accidental double-tap doesn't spam, but a genuine
// emergency is NEVER hard-blocked — the DB partial-unique (one active SOS per
// trip) is the real anti-duplicate; this just slows a flood.
export const sosRateLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 10,
  message: { success: false, message: 'Please wait a moment before raising another SOS.', code: 'RATE_LIMITED' },
});
