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

// Mobile-app forgot-password (OTP). One reset is 3 calls (+ resends), and a
// school's phones often share one Wi-Fi IP, so it gets a little more room than
// the school-admin reset above. The OTP itself is capped per request in the
// service (5 attempts, 3 resends), which is the real brute-force guard.
export const appPasswordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
  },
});

// Student / parent sign-in by mobile OTP. One sign-in is 2-3 calls (+ resends)
// and a school's phones often share one Wi-Fi IP. This only bounds the IP; the
// OTP itself is capped in the service (5 attempts, 3 resends, 5 SMS an hour
// per number), which is the real brute-force and SMS-flood guard.
export const otpLoginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

// Authenticated change-password: a stolen session token must not become an
// unlimited oracle for the current password. Keyed per account (mount AFTER
// the role guard) so teachers sharing a school Wi-Fi IP don't block each other.
export const changePasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `pwchange:${req.user?.sub || req.user?.userId || 'anon'}`,
  message: {
    success: false,
    message: 'Too many password change attempts. Please try again later.',
    code: 'RATE_LIMITED',
  },
});

// Public "Contact us" form: no login, so the IP budget is the only thing
// between a bot and thousands of junk rows in the Super Admin's enquiry inbox.
export const enquiryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'You have sent several enquiries already. Please try again later or email us directly.',
  },
});
