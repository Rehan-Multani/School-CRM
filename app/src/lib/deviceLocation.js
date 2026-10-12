import * as Location from 'expo-location';

// A step the user can fix themselves (permission / GPS off). `settings: true`
// means "Open settings" is the useful next action.
export class StepError extends Error {
  constructor(message, { settings = false } = {}) {
    super(message);
    this.settings = settings;
  }
}

// One GPS fix for the server to judge. The server — not the phone — decides
// whether the teacher is inside the school radius.
export async function currentFix() {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new StepError('Location permission is needed. Allow it in app settings.', { settings: true });
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    throw new StepError('Turn on your phone location (GPS) and try again.', { settings: true });
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    mocked: pos.mocked === true,
  };
}
