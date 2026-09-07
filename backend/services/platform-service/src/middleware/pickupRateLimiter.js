import rateLimit from 'express-rate-limit';

/**
 * Per-IP throttle for the abuse-prone safe-pickup mutations (initiate / verify /
 * resend). This is process-local (no Redis in this deployment) — the
 * correctness-critical limits live in the DB: one active session per student
 * (partial-unique index), per-session OTP attempt cap, and resend cooldown.
 *
 * TODO(prod): move to a shared store (Redis) for horizontal scaling.
 */
export const pickupRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20, // generous — a class teacher may process several pickups at dismissal
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test', // deterministic tests; real limit still active in dev/prod
  message: { success: false, message: 'Too many pickup requests. Please slow down.', code: 'OTP_RATE_LIMITED' },
});
