import { otpLoginService } from '../services/otpLogin.service.js';
import { auditLogService } from '../services/auditLog.service.js';

/**
 * Mobile-OTP sign-in for the student and parent apps. Public routes — the
 * caller is by definition not signed in; `role` in the body picks the flow.
 */

/** Same AUTH/LOGIN audit row the password logins write. */
function auditLogin(req, data) {
  const role = data.user?.role;
  const self = data.student || data.parent;
  if (!role || !self) return;
  const label = role === 'STUDENT' ? 'Student' : 'Parent';
  auditLogService.record(
    {
      user: { sub: self.id, userId: self.id, schoolId: data.school.id, name: self.name, role },
      headers: req.headers,
      socket: req.socket,
    },
    { module: 'AUTH', action: 'LOGIN', entityType: label, entityId: self.id, summary: `${label} ${self.name} logged in with mobile OTP` }
  );
}

export async function requestLoginOtp(req, res, next) {
  try {
    const data = await otpLoginService.requestOtp(req.body || {});
    res.json({ success: true, message: data.message, data });
  } catch (error) {
    next(error);
  }
}

export async function verifyLoginOtp(req, res, next) {
  try {
    const data = await otpLoginService.verifyOtp(req.body || {});
    if (data.needsSelection) {
      res.json({ success: true, message: 'Choose an account to continue', data });
      return;
    }
    auditLogin(req, data);
    res.json({ success: true, message: 'Login successful', data });
  } catch (error) {
    next(error);
  }
}

export async function selectLoginOtpAccount(req, res, next) {
  try {
    const data = await otpLoginService.selectAccount(req.body || {});
    auditLogin(req, data);
    res.json({ success: true, message: 'Login successful', data });
  } catch (error) {
    next(error);
  }
}
