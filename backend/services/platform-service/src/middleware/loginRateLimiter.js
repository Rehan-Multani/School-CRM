import rateLimit from 'express-rate-limit';

// Scoped to login endpoints specifically — the gateway's general per-IP limit (1000 req/15min
// across the whole API) is far too loose to stop credential brute-forcing on its own.
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});
