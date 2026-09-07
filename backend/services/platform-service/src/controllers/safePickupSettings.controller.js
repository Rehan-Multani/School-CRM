import { safePickupService } from '../services/safePickup.service.js';
import { schoolId } from '../utils/tenant.js';

export async function getSafePickupSettings(req, res, next) {
  try {
    const data = await safePickupService.getSettings(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateSafePickupSchool(req, res, next) {
  try {
    const data = await safePickupService.setSchoolEnabled(schoolId(req), req.body?.safePickupEnabled, req);
    res.json({ success: true, message: 'School safe-pickup setting updated', data });
  } catch (error) {
    next(error);
  }
}

export async function updateSafePickupClass(req, res, next) {
  try {
    const data = await safePickupService.setClassEnabled(
      schoolId(req),
      req.params.classId,
      req.body?.safePickupEnabled,
      req
    );
    res.json({ success: true, message: 'Class safe-pickup setting updated', data });
  } catch (error) {
    next(error);
  }
}

export async function getSafePickupHistory(req, res, next) {
  try {
    const result = await safePickupService.history(schoolId(req), req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
