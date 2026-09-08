import mongoose from 'mongoose';

/**
 * Server-side record for every issued refresh token.
 *
 * Without this the refresh flow is a bare stateless JWT: rotation hands out a new
 * token but the old one stays valid until it expires, logout cannot revoke
 * anything, and a stolen token is usable for its whole lifetime with no way to
 * notice. Persisting one row per issued token gives us three things a JWT alone
 * cannot: revocation, single-use enforcement, and reuse detection.
 *
 * Tokens are grouped into a `family` — one family per login. Rotating a token
 * marks the old row used and issues a successor in the same family. If a token
 * that was *already* rotated is presented again, that means someone replayed a
 * token we have already retired (the classic stolen-token signal), so the entire
 * family is revoked and both the attacker and the victim are forced to log in.
 *
 * Only a SHA-256 hash of the token id is stored, so a database leak does not
 * hand over usable refresh tokens.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    // SHA-256 of the JWT's jti — never the token itself.
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdminUser', required: true, index: true },
    // All tokens descended from a single login share this id.
    family: { type: String, required: true, index: true },
    usedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: { type: String, default: '' },
    // TTL index: Mongo removes the row once the token could no longer be valid.
    expiresAt: { type: Date, required: true },
    createdByIp: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.virtual('isActive').get(function isActive() {
  return !this.usedAt && !this.revokedAt && this.expiresAt.getTime() > Date.now();
});

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
