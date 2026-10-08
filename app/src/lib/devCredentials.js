// Login prefill, read from app/.env (git-ignored) while developing.
// A release build ships no credentials (__DEV__ is false there) unless its EAS
// profile sets EXPO_PUBLIC_PREFILL_LOGIN=1 — only the internal test/demo
// profile (`vps` in eas.json) does. Never set it on a store build: anything
// inside an APK can be read out of it.
// Expo inlines EXPO_PUBLIC_* only for literal `process.env.X` references —
// keep each one spelled out.
const PREFILL = __DEV__ || process.env.EXPO_PUBLIC_PREFILL_LOGIN === '1';

const DEV = PREFILL
  ? {
      TEACHER: [process.env.EXPO_PUBLIC_DEV_TEACHER_ID, process.env.EXPO_PUBLIC_DEV_TEACHER_PASSWORD],
      STUDENT: [process.env.EXPO_PUBLIC_DEV_STUDENT_ID, process.env.EXPO_PUBLIC_DEV_STUDENT_PASSWORD],
      PARENT: [process.env.EXPO_PUBLIC_DEV_PARENT_ID, process.env.EXPO_PUBLIC_DEV_PARENT_PASSWORD],
      TRANSPORT: [process.env.EXPO_PUBLIC_DEV_TRANSPORT_ID, process.env.EXPO_PUBLIC_DEV_TRANSPORT_PASSWORD],
      PRINCIPAL: [process.env.EXPO_PUBLIC_DEV_PRINCIPAL_ID, process.env.EXPO_PUBLIC_DEV_PRINCIPAL_PASSWORD],
    }
  : {};

export function devCredentials(roleKey) {
  const [identifier = '', password = ''] = DEV[roleKey] || [];
  return { identifier, password };
}

// The OTP to prefill on the verify screen for a demo login. Only when login
// prefill is on AND the entered mobile is that role's prefilled demo number, so
// every other number still has to type the OTP it receives by SMS. (The server
// accepts the fixed demo OTP only for numbers listed in LOGIN_DEMO_NUMBERS.)
const lastTen = (v) => String(v || '').replace(/\D/g, '').slice(-10);
export function devOtp(roleKey, mobile) {
  if (!PREFILL) return '';
  const [id] = DEV[roleKey] || [];
  const otp = roleKey === 'PARENT' ? process.env.EXPO_PUBLIC_DEV_PARENT_OTP : roleKey === 'STUDENT' ? process.env.EXPO_PUBLIC_DEV_STUDENT_OTP : '';
  return otp && id && lastTen(id) === lastTen(mobile) ? String(otp) : '';
}
