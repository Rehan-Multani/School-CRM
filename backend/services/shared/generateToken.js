import { createRequire } from 'module';
import path from 'path';

function jwt() {
  const require = createRequire(path.join(process.cwd(), 'package.json'));
  return require('jsonwebtoken');
}

export function signAccessToken(payload, { secret, expiresIn }) {
  return jwt().sign(payload, secret, { expiresIn });
}

export function signRefreshToken(payload, { secret, expiresIn }) {
  return jwt().sign(payload, secret, { expiresIn });
}

export function verifyToken(token, secret) {
  return jwt().verify(token, secret);
}
