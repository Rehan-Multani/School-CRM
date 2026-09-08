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

export async function updatePlatformLogo(req, res, next) {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ success: false, message: 'No logo image was uploaded', code: 'VALIDATION_ERROR' });
      return;
    }
    const data = await platformSettingService.setLogo(req.file.buffer, req.user?.sub || null);
    res.json({ success: true, message: 'Platform logo updated', data });
  } catch (error) {
    next(error);
  }
}

export async function deletePlatformLogo(req, res, next) {
  try {
    const data = await platformSettingService.clearLogo(req.user?.sub || null);
    res.json({ success: true, message: 'Platform logo reset to default', data });
  } catch (error) {
    next(error);
  }
}
