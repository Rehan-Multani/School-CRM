// Dev-only login prefill, read from app/.env.local (git-ignored). Never used in
// a release build (__DEV__ is false there), so no password ships in the APK.
// Expo inlines EXPO_PUBLIC_* only for literal `process.env.X` references —
// keep each one spelled out.
const DEV = __DEV__
  ? {
      TEACHER: [process.env.EXPO_PUBLIC_DEV_TEACHER_ID, process.env.EXPO_PUBLIC_DEV_TEACHER_PASSWORD],
      STUDENT: [process.env.EXPO_PUBLIC_DEV_STUDENT_ID, process.env.EXPO_PUBLIC_DEV_STUDENT_PASSWORD],
      PARENT: [process.env.EXPO_PUBLIC_DEV_PARENT_ID, process.env.EXPO_PUBLIC_DEV_PARENT_PASSWORD],
      TRANSPORT: [process.env.EXPO_PUBLIC_DEV_TRANSPORT_ID, process.env.EXPO_PUBLIC_DEV_TRANSPORT_PASSWORD],
    }
  : {};

export function devCredentials(roleKey) {
  const [identifier = '', password = ''] = DEV[roleKey] || [];
  return { identifier, password };
}
