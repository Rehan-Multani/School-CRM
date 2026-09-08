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

// Password reset is a separate, tighter budget: /forgot-password doubles as an
// account-enumeration oracle and /reset-password is a guessable-token endpoint,
// so neither should get the same allowance as an ordinary login.
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
  },
});
