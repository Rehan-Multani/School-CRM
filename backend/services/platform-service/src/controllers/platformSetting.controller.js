import { platformSettingService } from '../services/platformSetting.service.js';

export async function getPlatformSettings(req, res, next) {
  try {
    const data = await platformSettingService.getSettings();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updatePlatformSettings(req, res, next) {
  try {
    const data = await platformSettingService.updateSettings(req.body || {}, req.user?.sub || null);
    res.json({ success: true, message: 'Platform settings updated', data });
  } catch (error) {
    next(error);
  }
}
