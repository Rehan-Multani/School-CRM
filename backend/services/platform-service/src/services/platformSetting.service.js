import { AppError } from '../../../shared/AppError.js';
import { platformSettingRepository } from '../repositories/platformSetting.repository.js';

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
}

export const platformSettingService = new PlatformSettingService();
