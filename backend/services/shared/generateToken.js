import jwt from 'jsonwebtoken';

export function signAccessToken(payload, { secret, expiresIn }) {
  return jwt.sign(payload, secret, { expiresIn });
}

export function signRefreshToken(payload, { secret, expiresIn }) {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}