import crypto from 'crypto';
import { RefreshToken } from '../models/RefreshToken.js';

/** Refresh tokens are stored hashed, so a DB dump yields nothing replayable. */
export function hashTokenId(jti) {
  return crypto.createHash('sha256').update(String(jti)).digest('hex');
}

export class RefreshTokenRepository {
  create({ jti, userId, family, expiresAt, createdByIp = '', userAgent = '' }) {
    return RefreshToken.create({
      tokenHash: hashTokenId(jti),
      userId,
      family,
      expiresAt,
      createdByIp,
      userAgent,
    });
  }

  findByJti(jti) {
    return RefreshToken.findOne({ tokenHash: hashTokenId(jti) });
  }

  /**
   * Atomically claim a token for rotation.
   *
   * The `usedAt: null` filter is what makes rotation single-use even when two
   * requests race with the same token: exactly one update matches, the loser
   * gets null and is treated as a replay.
   */
  markUsed(jti) {
    return RefreshToken.findOneAndUpdate(
      { tokenHash: hashTokenId(jti), usedAt: null, revokedAt: null },
      { $set: { usedAt: new Date() } },
      { new: true }
    );
  }

  revokeFamily(family, reason) {
    return RefreshToken.updateMany(
      { family, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } }
    );
  }

  revokeAllForUser(userId, reason) {
    return RefreshToken.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedReason: reason } }
    );
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
