// Extends app.json with build-time switches set by the EAS profiles (eas.json):
//
// ALLOW_HTTP=1   (`local` only) a release build blocks plain http://, so an APK
//                that talks to a backend on the LAN needs cleartext allowed.
//                Store / production builds stay HTTPS-only.
// APP_RELEASE=1  (`local`, `preview`, `production`) a real release: R8 shrinks
//                and obfuscates the Java/Kotlin code, unused resources are
//                dropped, and only real-phone CPU types are packaged (no x86
//                emulator libraries). The `debug` profile leaves this off so
//                it still runs on an emulator.
const RAZORPAY_PROGUARD = `
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-dontwarn com.razorpay.**
-keep class com.razorpay.** { *; }
-optimizations !method/inlining/*
-keepclasseswithmembers class * { public void onPayment*(...); }
`;

module.exports = ({ config }) => {
  const android = {};
  if (process.env.ALLOW_HTTP === '1') android.usesCleartextTraffic = true;
  if (process.env.APP_RELEASE === '1') {
    android.enableMinifyInReleaseBuilds = true;
    android.enableShrinkResourcesInReleaseBuilds = true;
    android.extraProguardRules = RAZORPAY_PROGUARD;
    android.buildArchs = ['arm64-v8a', 'armeabi-v7a'];
  }
  if (!Object.keys(android).length) return config;
  return {
    ...config,
    plugins: [
      ...(config.plugins || []).filter((p) => p !== 'expo-build-properties'),
      ['expo-build-properties', { android }],
    ],
  };
};
