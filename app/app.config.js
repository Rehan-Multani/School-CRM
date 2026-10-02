// Extends app.json. A release build blocks plain http://, so an APK that talks
// to a backend on the LAN (EXPO_PUBLIC_API_URL=http://192.168.x.x…) needs
// cleartext traffic allowed. Only the `local` EAS profile sets ALLOW_HTTP=1 —
// store / production builds stay HTTPS-only.
module.exports = ({ config }) => {
  if (process.env.ALLOW_HTTP !== '1') return config;
  return {
    ...config,
    plugins: [
      ...(config.plugins || []).filter((p) => p !== 'expo-build-properties'),
      ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
    ],
  };
};
