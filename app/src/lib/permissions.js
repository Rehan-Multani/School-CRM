import { PermissionsAndroid, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Expo Go on Android throws as soon as `expo-notifications` is *imported*
// (remote push was removed from Expo Go in SDK 53). So the module is only
// required lazily, and never inside Expo Go on Android — there we fall back to
// the plain Android POST_NOTIFICATIONS prompt. Dev/release builds get the full
// expo-notifications setup.
const isExpoGoAndroid =
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications = null;
export function getNotifications() {
  if (isExpoGoAndroid) return null;
  if (!Notifications) {
    Notifications = require('expo-notifications');
    // Show notifications as banners even while the app is open.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return Notifications;
}

async function ensureNotificationPermission() {
  const N = getNotifications();

  if (!N) {
    // Expo Go Android: runtime prompt exists only on Android 13+ (API 33).
    if (Platform.Version < 33) return true;
    const perm = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
    if (await PermissionsAndroid.check(perm)) return true;
    return (await PermissionsAndroid.request(perm)) === PermissionsAndroid.RESULTS.GRANTED;
  }

  // Android 13+ only shows the prompt once a channel exists.
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync('default', {
      name: 'General',
      importance: N.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1D4ED8',
    });
  }
  const current = await N.getPermissionsAsync();
  if (current.granted || !current.canAskAgain) return current.granted;
  const next = await N.requestPermissionsAsync();
  return next.granted;
}

// The only runtime permission the app needs is notifications. An
// already-granted / permanently-denied permission is skipped, so the user is
// never nagged. Photos and files go through the system pickers — no camera or
// storage permission. Internet / network-state are install-time on Android.
export async function requestStartupPermissions() {
  const result = { notifications: false };
  try {
    result.notifications = await ensureNotificationPermission();
  } catch {
    // unsupported environment — ignore
  }
  return result;
}

// After login: hand the native (FCM/APNs) push token to the role's
// `POST device-tokens`. Silently skipped where remote push can't work (Expo Go
// on Android, simulators, permission denied). Returns the token or null.
export async function registerPushToken(register) {
  try {
    const N = getNotifications();
    if (!N) return null;
    const perm = await N.getPermissionsAsync();
    if (!perm.granted) return null;
    const { data } = await N.getDevicePushTokenAsync();
    if (typeof data !== 'string' || data.length < 20) return null;
    await register(data, Platform.OS);
    return data;
  } catch {
    return null;
  }
}
