import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// `isInternetReachable` is null while NetInfo is still probing — only an
// explicit false counts as offline, so we never flash an offline screen.
export function isOfflineState(state) {
  return state?.isConnected === false || state?.isInternetReachable === false;
}

/** Live `true` while the device has no internet. */
export function useOffline() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    NetInfo.fetch().then((s) => setOffline(isOfflineState(s))).catch(() => {});
    return NetInfo.addEventListener((s) => setOffline(isOfflineState(s)));
  }, []);
  return offline;
}
