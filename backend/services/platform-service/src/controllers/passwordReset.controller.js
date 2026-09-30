import { passwordResetService } from '../services/passwordReset.service.js';

/**
 * Forgot-password (mobile OTP) for the four mobile-app roles. Public routes —
 * the caller is by definition not signed in; `role` in the body picks the flow.
 */

export async function requestPasswordResetOtp(req, res, next) {
  try {
    const data = await passwordResetService.requestOtp(req.body);
    res.json({ success: true, message: data.message, data });
  } catch (error) {
    next(error);
  }
}

export async function verifyPasswordResetOtp(req, res, next) {
  try {
    const data = await passwordResetService.verifyOtp(req.body);
    res.json({ success: true, message: 'OTP verified', data });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordWithOtpToken(req, res, next) {
  try {
    const data = await passwordResetService.resetPassword(req.body);
    res.json({ success: true, message: data.message, data });
  } catch (error) {
    next(error);
  }
}
