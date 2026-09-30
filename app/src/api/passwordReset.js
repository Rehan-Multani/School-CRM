import { api } from './client';

// Forgot password (all four roles) — OTP to the registered mobile.
// 1. requestOtp → SMS   2. verifyOtp → resetToken   3. resetPassword
export const passwordResetApi = {
  requestOtp: (role, identifier) =>
    api.post('/school-portal/auth/forgot-password', { role, identifier: identifier.trim() }).then((r) => r.data),
  verifyOtp: (role, identifier, otp) =>
    api.post('/school-portal/auth/verify-reset-otp', { role, identifier: identifier.trim(), otp }).then((r) => r.data),
  resetPassword: (resetToken, newPassword) =>
    api.post('/school-portal/auth/reset-password', { resetToken, newPassword }).then((r) => r.data),
};
