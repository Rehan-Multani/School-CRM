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

const VERSION_FIELDS = {
  appLatestVersion: 'Latest version',
  appMinVersion: 'Minimum version',
};
const MAX_UPDATE_MESSAGE = 300;

// '1', '1.2', '1.2.3' — the same shape as `version` in the app's app.json.
function normalizeVersion(value, label) {
  if (value === undefined || value === null) return undefined;
  const version = String(value).trim();
  if (!version) return '';
  if (!/^\d{1,4}(\.\d{1,4}){0,3}$/.test(version)) {
    throw new AppError(`${label} must look like 1.2.0`, 400);
  }
  return version;
}

/** -1 / 0 / 1 for dotted versions; a missing part counts as 0 (1.2 == 1.2.0). */
export function compareVersions(a, b) {
  const pa = String(a || '').split('.').map(Number);
  const pb = String(b || '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff) return diff < 0 ? -1 : 1;
  }
  return 0;
}

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

    for (const [field, label] of Object.entries(VERSION_FIELDS)) {
      const next = normalizeVersion(patch?.[field], label);
      if (next !== undefined) {
        update[field] = next;
      }
    }
    if (patch?.appUpdateMessage !== undefined && patch.appUpdateMessage !== null) {
      const message = String(patch.appUpdateMessage).trim();
      if (message.length > MAX_UPDATE_MESSAGE) {
        throw new AppError(`Update message must be ${MAX_UPDATE_MESSAGE} characters or fewer`, 400);
      }
      update.appUpdateMessage = message;
    }

    // Forcing an update to a version newer than the one on offer would lock
    // every user out with nothing to install.
    const current = await platformSettingRepository.findPlatformSetting();
    const latest = update.appLatestVersion ?? current?.appLatestVersion ?? '';
    const min = update.appMinVersion ?? current?.appMinVersion ?? '';
    if (min && !latest) {
      throw new AppError('Set the latest version before setting a minimum version', 400);
    }
    if (min && compareVersions(min, latest) > 0) {
      throw new AppError('Minimum version cannot be higher than the latest version', 400);
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
