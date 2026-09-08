import sharp from 'sharp';
import { AppError } from '../../../shared/AppError.js';
import { platformSettingRepository } from '../repositories/platformSetting.repository.js';

// Encoded logo cap. A 256px WebP icon is ~5-20 KB; anything past this means a
// bad upload — keep the public /app-config response small.
const MAX_LOGO_DATA_URI = 256 * 1024;

const URL_FIELDS = {
  playStoreUrl: 'Play Store URL',
  appStoreUrl: 'App Store URL',
  apkUrl: 'APK URL',
};
const MAX_URL = 2048;

// undefined  -> field not supplied, leave unchanged
// ''         -> explicit clear
// 'https://…'-> validated value
function normalizeUrl(value, label) {
  if (value === undefined || value === null) return undefined;
  const url = String(value).trim();
  if (!url) return '';
  if (url.length > MAX_URL) {
    throw new AppError(`${label} must be ${MAX_URL} characters or fewer`, 400);
  }
  if (!/^https?:\/\/\S+$/i.test(url)) {
    throw new AppError(`${label} must be a valid http(s) URL`, 400);
  }
  return url;
}

export class PlatformSettingService {
  async getSettings() {
    const existing = await platformSettingRepository.findPlatformSetting();
    if (existing) {
      return existing.toPublicJSON();
    }
    const created = await platformSettingRepository.upsertPlatformSetting({ updatedBy: 'seed' });
    return created.toPublicJSON();
  }

  async updateSettings(patch, updatedBy) {
    const update = { updatedBy: updatedBy || null };

    for (const [field, label] of Object.entries(URL_FIELDS)) {
      const next = normalizeUrl(patch?.[field], label);
      if (next !== undefined) {
        update[field] = next;
      }
    }

    const document = await platformSettingRepository.upsertPlatformSetting(update);
    return document.toPublicJSON();
  }

  // Re-encode an uploaded image to a small transparent-padded WebP and store it
  // inline as a data URI so unauthenticated pages can render it.
  async setLogo(buffer, updatedBy) {
    if (!buffer || !buffer.length) {
      throw new AppError('No logo image was uploaded', 400);
    }

    let webp;
    try {
      webp = await sharp(buffer, { failOn: 'none' })
        .rotate()
        .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90 })
        .toBuffer();
    } catch {
      throw new AppError('Could not read that image. Upload a valid PNG, JPG, SVG, or WebP.', 400);
    }

    const dataUri = `data:image/webp;base64,${webp.toString('base64')}`;
    if (dataUri.length > MAX_LOGO_DATA_URI) {
      throw new AppError('Logo image is too large after optimisation. Use a simpler icon.', 400);
    }

    const document = await platformSettingRepository.upsertPlatformSetting({
      logo: dataUri,
      updatedBy: updatedBy || null,
    });
    return document.toPublicJSON();
  }

  async clearLogo(updatedBy) {
    const document = await platformSettingRepository.upsertPlatformSetting({
      logo: '',
      updatedBy: updatedBy || null,
    });
    return document.toPublicJSON();
  }
}

export const platformSettingService = new PlatformSettingService();
