import { PlatformSetting } from '../models/PlatformSetting.js';

const PLATFORM_KEY = 'platform';

export class PlatformSettingRepository {
  findPlatformSetting() {
    return PlatformSetting.findOne({ key: PLATFORM_KEY });
  }

  upsertPlatformSetting(patch) {
    return PlatformSetting.findOneAndUpdate(
      { key: PLATFORM_KEY },
      { ...patch, key: PLATFORM_KEY },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

export const platformSettingRepository = new PlatformSettingRepository();
