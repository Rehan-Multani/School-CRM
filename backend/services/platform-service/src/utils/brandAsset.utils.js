import crypto from 'crypto';

// School logos are stored inline as `data:image/...;base64,` URIs (see
// normalizeLogo in school.service.js). These helpers let them be served as a
// cacheable image URL instead of riding inside every JSON response.

export function isImageDataUri(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

/** Short content hash: the `?v=` cache-buster and the image's ETag. */
export function brandAssetVersion(value) {
  return crypto.createHash('md5').update(String(value || '')).digest('hex').slice(0, 12);
}

/** `{ contentType, buffer }` for a base64 image data URI, else null. */
export function parseImageDataUri(value) {
  if (!isImageDataUri(value)) return null;
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is.exec(value);
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  return buffer.length ? { contentType: match[1].toLowerCase(), buffer } : null;
}

/** Path (relative to the platform router) of a school's logo image. */
export function schoolLogoPath(schoolId, logo) {
  return `/school-theme/${encodeURIComponent(schoolId)}/logo?v=${brandAssetVersion(logo)}`;
}
