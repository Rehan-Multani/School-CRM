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

/**
 * Re-encodes a raster image data URI as a small WebP data URI (fits inside
 * maxSize x maxSize, never enlarged, transparency kept). Vector (SVG), animated
 * or unreadable inputs come back unchanged so nothing a school uploaded is lost.
 */
export async function toWebpDataUri(value, maxSize = 512, sharpLib = null) {
  const parsed = parseImageDataUri(value);
  if (!parsed || /svg|gif/.test(parsed.contentType)) return value;
  try {
    const sharp = sharpLib || (await import('sharp')).default;
    const buffer = await sharp(parsed.buffer, { failOn: 'none' })
      .rotate() // honour camera orientation, then drop the metadata
      .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86 })
      .toBuffer();
    if (!buffer.length || buffer.length >= parsed.buffer.length * 1.2) return value;
    return `data:image/webp;base64,${buffer.toString('base64')}`;
  } catch {
    return value;
  }
}

/** Path (relative to the platform router) of a school's logo image. */
export function schoolLogoPath(schoolId, logo) {
  return `/school-theme/${encodeURIComponent(schoolId)}/logo?v=${brandAssetVersion(logo)}`;
}
