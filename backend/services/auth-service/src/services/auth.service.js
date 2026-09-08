import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { authRepository } from '../repositories/auth.repository.js';
import { refreshTokenRepository } from '../repositories/refreshToken.repository.js';
import { AppError } from '../../../shared/AppError.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../../../shared/generateToken.js';

const BCRYPT_ROUNDS = 12;

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
