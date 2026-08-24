import { legalService } from '../services/legal.service.js';

export async function getLegalDocuments(req, res, next) {
  try {
    const data = await legalService.getDocuments();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateLegalDocuments(req, res, next) {
  try {
    const data = await legalService.updateDocuments({
      privacyPolicy: req.body?.privacyPolicy,
      termsOfService: req.body?.termsOfService,
      updatedBy: req.user?.sub || null,
    });

    res.json({
      success: true,
      message: 'Privacy policy and terms of service updated',
      data,
    });
  } catch (error) {
    next(error);
  }
}
