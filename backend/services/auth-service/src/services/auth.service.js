import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { authRepository } from '../repositories/auth.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { AppError } from '../../../shared/AppError.js';
import { LoginChallenge } from '../models/LoginChallenge.js';
import { sendLoginOtpEmail, isSmtpConfigured } from '../config/mailer.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../../../shared/generateToken.js';

const BCRYPT_ROUNDS = 12;

// Sign-in is two steps: password, then a 6-digit OTP emailed to the account.
const OTP_TTL_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_MAX_RESENDS = 3;

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
// Keyed so a leaked challenge row cannot be brute-forced offline (1e6 codes).
export const hashOtp = (challengeId, otp) =>
  crypto.createHmac('sha256', env.jwtSecret).update(`${challengeId}:${otp}`).digest('hex');

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function maskEmail(email) {
  const [local = '', domain = ''] = String(email).split('@');
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${'*'.repeat(Math.max(local.length - head.length, 3))}@${domain}`;
}

/** Generate + email a fresh OTP; returns the keyed hash to persist. */
async function emailOtp(admin, challengeId) {
  // Mail service switched off: fixed code, nothing is sent (LOGIN_OTP_FIXED_CODE).
  if (env.loginOtpFixedCode) {
    return hashOtp(challengeId, env.loginOtpFixedCode);
  }
  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  if (env.nodeEnv === 'production' && !isSmtpConfigured()) {
    throw new AppError('Email service is not configured, so the sign-in OTP cannot be sent.', 503);
  }
  try {
    await sendLoginOtpEmail({
      to: admin.email,
      name: admin.name,
      otp,
      minutes: OTP_TTL_SECONDS / 60,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[auth] failed to email login OTP:', error.message);
    throw new AppError('Could not send the OTP email. Please try again.', 502);
  }
  return hashOtp(challengeId, otp);
}

/**
 * Issue an access/refresh pair and persist a record for the refresh half.
 *
 * The refresh JWT carries a `jti`; only its SHA-256 hash is stored. `family`
 * groups every token descended from one login so a detected replay can revoke
 * the whole chain at once.
 */
async function issueTokens(admin, { family, context = {} } = {}) {
  const userId = admin._id.toString();
  const jti = crypto.randomUUID();
  const tokenFamily = family || crypto.randomUUID();

  const refreshToken = signRefreshToken(
    { sub: userId, role: 'SuperAdmin', jti, family: tokenFamily },
    { secret: env.jwtRefreshSecret, expiresIn: env.jwtRefreshExpiresIn }
  );

  // Mirror the JWT's own expiry onto the row so the TTL index reaps it in step.
  const { exp } = verifyToken(refreshToken, env.jwtRefreshSecret);

  await refreshTokenRepository.create({
    jti,
    userId,
    family: tokenFamily,
    expiresAt: new Date(exp * 1000),
    createdByIp: context.ip || '',
    userAgent: context.userAgent || '',
  });

  return {
    token: signAccessToken(
      { sub: userId, role: 'SuperAdmin' },
      { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn }
    ),
    refreshToken,
    user: admin.toSafeJSON(),
  };
}

function normalizeAvatar(value) {
  if (value === undefined) return undefined;
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (text.startsWith('data:image/')) {
    if (text.length > 3_000_000) {
      throw new AppError('Profile photo is too large. Please upload an image under 2MB.', 400);
    }
    return text;
  }
  if (/^https?:\/\/.+/i.test(text)) {
    return text;
  }
  throw new AppError('Profile photo must be a valid image', 400);
}

export class AuthService {
  async login({ email, password }, context = {}) {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const admin = await authRepository.findByEmailWithPassword(normalizedEmail);
    if (!admin) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    return issueTokens(admin, { context });
  }

  /**
   * Option 2 — passwordless sign-in. Email in, OTP out, no password involved.
   * The answer is identical whether or not the email belongs to a Super Admin
   * (unknown emails get a throw-away challengeId that can never verify), so the
   * endpoint cannot be used to discover the admin's address.
   */
  async requestLoginOtp({ email }, context = {}) {
    const normalizedEmail = String(email ?? '').toLowerCase().trim();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new AppError('Enter a valid email address', 400);
    }

    const challengeId = crypto.randomBytes(32).toString('base64url');
    const admin = await authRepository.findByEmail(normalizedEmail);
    if (admin) {
      await LoginChallenge.deleteMany({ userId: admin._id });
      const otpHash = await emailOtp(admin, challengeId);
      await LoginChallenge.create({
        userId: admin._id,
        challengeHash: sha256(challengeId),
        otpHash,
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
        createdByIp: context.ip || '',
        userAgent: context.userAgent || '',
      });
    }

    const masked = maskEmail(normalizedEmail);
    return {
      challengeId,
      maskedEmail: masked,
      expiresInSeconds: OTP_TTL_SECONDS,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      message: `If this email is registered, an OTP was sent to ${masked}`,
    };
  }

  async verifyLoginOtp({ challengeId, otp }, context = {}) {
    const code = String(otp ?? '').trim();
    if (!challengeId || !/^\d{6}$/.test(code)) {
      throw new AppError('Enter the 6-digit OTP sent to your email', 400);
    }

    const challenge = await LoginChallenge.findOne({ challengeHash: sha256(challengeId) });
    if (!challenge || challenge.expiresAt <= new Date()) {
      throw new AppError('Incorrect or expired OTP', 401);
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      await challenge.deleteOne();
      throw new AppError('Too many wrong attempts. Please sign in again.', 429);
    }

    if (!safeEqual(hashOtp(challengeId, code), challenge.otpHash)) {
      challenge.attempts += 1;
      await challenge.save();
      throw new AppError('Incorrect OTP', 401);
    }

    // Single use: consume before issuing so a replay of the same code fails.
    const consumed = await LoginChallenge.findOneAndDelete({ _id: challenge._id });
    if (!consumed) {
      throw new AppError('OTP already used. Please sign in again.', 401);
    }

    const admin = await authRepository.findById(challenge.userId);
    if (!admin) {
      throw new AppError('Account not found', 404);
    }
    admin.lastLoginAt = new Date();
    await admin.save();

    return issueTokens(admin, { context });
  }

  async resendLoginOtp({ challengeId }) {
    if (!challengeId) {
      throw new AppError('Sign-in session missing. Please sign in again.', 400);
    }
    const challenge = await LoginChallenge.findOne({ challengeHash: sha256(challengeId) });
    if (!challenge) {
      // Unknown id = unregistered email from requestLoginOtp(); answer the same
      // as a real resend so the two cases cannot be told apart.
      return {
        maskedEmail: '',
        expiresInSeconds: OTP_TTL_SECONDS,
        resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
      };
    }
    if (challenge.expiresAt <= new Date()) {
      throw new AppError('Sign-in session expired. Please start again.', 401);
    }
    const waitMs = challenge.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now();
    if (waitMs > 0) {
      throw new AppError(`Please wait ${Math.ceil(waitMs / 1000)}s before requesting a new OTP`, 429);
    }
    if (challenge.resendCount >= OTP_MAX_RESENDS) {
      throw new AppError('Resend limit reached. Please sign in again.', 429);
    }

    const admin = await authRepository.findById(challenge.userId);
    if (!admin) {
      throw new AppError('Account not found', 404);
    }
    challenge.otpHash = await emailOtp(admin, challengeId);
    challenge.attempts = 0;
    challenge.resendCount += 1;
    challenge.lastSentAt = new Date();
    challenge.expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000);
    await challenge.save();

    return {
      maskedEmail: maskEmail(admin.email),
      expiresInSeconds: OTP_TTL_SECONDS,
      resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  async me(userId) {
    const admin = await authRepository.findById(userId);
    if (!admin) {
      throw new AppError('Account not found', 404);
    }
    return { user: admin.toSafeJSON() };
  }

  async updateProfile(userId, { name, avatar }) {
    const admin = await authRepository.findById(userId);
    if (!admin) {
      throw new AppError('Account not found', 404);
    }

    const nextName = typeof name === 'string' ? name.trim() : '';
    if (!nextName) {
      throw new AppError('Name is required', 400);
    }

    admin.name = nextName;
    const nextAvatar = normalizeAvatar(avatar);
    if (nextAvatar !== undefined) {
      admin.avatar = nextAvatar;
    }
    await admin.save();

    return { user: admin.toSafeJSON() };
  }

  async changePassword(userId, { currentPassword, newPassword }) {
    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }
    if (String(newPassword).length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    const admin = await authRepository.findByIdWithPassword(userId);
    if (!admin) {
      throw new AppError('Account not found', 404);
    }

    const matches = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!matches) {
      throw new AppError('Current password is incorrect', 401);
    }

    admin.passwordHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
    await admin.save();

    // A password change is how someone reacts to a suspected compromise, so it
    // has to end every other session — otherwise a stolen refresh token keeps
    // working against the new password.
    await refreshTokenRepository.revokeAllForUser(admin._id, 'password_changed');

    return { user: admin.toSafeJSON() };
  }

  async refresh(refreshToken, context = {}) {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    let payload;
    try {
      payload = verifyToken(refreshToken, env.jwtRefreshSecret);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    if (payload.role !== 'SuperAdmin' || !payload.sub || !payload.jti) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Single-use claim. A token we have no row for, or one already spent, is a
    // replay of something we retired — the stolen-token signal — so we burn the
    // whole family rather than just refusing this one request.
    const claimed = await refreshTokenRepository.markUsed(payload.jti);
    if (!claimed) {
      const known = await refreshTokenRepository.findByJti(payload.jti);
      if (known) {
        await refreshTokenRepository.revokeFamily(known.family, 'refresh_token_reuse_detected');
      } else if (payload.family) {
        await refreshTokenRepository.revokeFamily(payload.family, 'refresh_token_reuse_detected');
      }
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const admin = await authRepository.findById(payload.sub);
    if (!admin) {
      throw new AppError('Account not found', 401);
    }

    return issueTokens(admin, { family: claimed.family, context });
  }

  /** Explicit logout — revokes every refresh token issued to this admin. */
  async logout(userId) {
    if (!userId) {
      throw new AppError('Not authenticated', 401);
    }
    await refreshTokenRepository.revokeAllForUser(userId, 'logout');
    return { loggedOut: true };
  }
}

export const authService = new AuthService();
