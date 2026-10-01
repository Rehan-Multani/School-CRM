import { api } from './client';

// Student / parent sign-in — OTP to the mobile number given at admission.
// 1. requestOtp → SMS   2. verifyOtp → session, or a list of accounts to pick
// from when the number has more than one   3. selectAccount → session
export const otpLoginApi = {
  requestOtp: (role, mobile) =>
    api.post('/school-portal/auth/otp-login/request', { role, mobile }).then((r) => r.data),
  verifyOtp: (role, mobile, otp) =>
    api.post('/school-portal/auth/otp-login/verify', { role, mobile, otp }).then((r) => r.data),
  selectAccount: (selectionToken, accountId) =>
    api.post('/school-portal/auth/otp-login/select', { selectionToken, accountId }).then((r) => r.data),
};
