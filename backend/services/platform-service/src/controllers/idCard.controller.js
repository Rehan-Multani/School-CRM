import { idCardService } from '../services/idCard.service.js';
import { schoolId } from '../utils/tenant.js';
import { sendSuccess } from '../../../shared/response.js';

export async function idCardOptions(req, res, next) {
  try {
    const data = await idCardService.options(schoolId(req));
    return sendSuccess(res, data, 'ID card options retrieved successfully');
  } catch (error) {
    next(error);
  }
}

export async function saveIdCardDesign(req, res, next) {
  try {
    const data = await idCardService.saveDesign(schoolId(req), req.body);
    return sendSuccess(res, data, 'ID card design saved');
  } catch (error) {
    next(error);
  }
}

export async function idCardStudents(req, res, next) {
  try {
    const result = await idCardService.students(schoolId(req), req.query);
    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
