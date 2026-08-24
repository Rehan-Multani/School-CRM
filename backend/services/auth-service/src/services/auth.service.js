import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { authRepository } from '../repositories/auth.repository.js';
import { AppError } from '../../../shared/AppError.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../../../shared/generateToken.js';

const BCRYPT_ROUNDS = 12;

function issueTokens(admin) {
  const tokenPayload = { sub: admin._id.toString(), role: 'SuperAdmin' };

  return {
    token: signAccessToken(tokenPayload, {
      secret: env.jwtSecret,
      expiresIn: env.jwtExpiresIn,
    }),
    refreshToken: signRefreshToken(tokenPayload, {
      secret: env.jwtRefreshSecret,
      expiresIn: env.jwtRefreshExpiresIn,
    }),
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
  async login({ email, password }) {
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

    return issueTokens(admin);
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

    return { user: admin.toSafeJSON() };
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    let payload;
    try {
      payload = verifyToken(refreshToken, env.jwtRefreshSecret);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    if (payload.role !== 'SuperAdmin' || !payload.sub) {
      throw new AppError('Invalid refresh token', 401);
    }

    const admin = await authRepository.findById(payload.sub);
    if (!admin) {
      throw new AppError('Account not found', 401);
    }

    return issueTokens(admin);
  }
}

export const authService = new AuthService();
