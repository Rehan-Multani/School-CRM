import { useEffect, useRef } from 'react';
import { getNotifications } from './permissions';
import { emitPushReceived, openNotificationLink } from './pushRouting';

// Push behaviour while signed in (dev/release builds only — Expo Go on Android
// has no remote push, and getNotifications() returns null there):
//   • push arrives with the app open → bell badges refresh (banner is shown by
//     the handler set in permissions.js)
//   • user taps a push (app open, backgrounded, or cold-started by the tap)
//     → open the screen from its `{ type, id }` payload
const SYSTEM_TYPES = ['app_update', 'force_logout'];

export function usePushHandling(role) {
  const handledColdStart = useRef(false);

  useEffect(() => {
    const N = getNotifications();
    if (!N || !role) return undefined;

    const open = (response) => {
      const data = response?.notification?.request?.content?.data || {};
      // A push addressed to another role (e.g. an old token) must not route here.
      if (data.role && data.role.toUpperCase() !== role) return;
      // System pushes open nothing: the update popup (AppUpdateGate) and the
      // signed-out popup (AuthContext) react to the event below.
      if (!SYSTEM_TYPES.includes(data.type)) openNotificationLink(role, { type: data.type, id: data.id });
      emitPushReceived(data);
    };

    const received = N.addNotificationReceivedListener((n) => emitPushReceived(n?.request?.content?.data || {}));
    const tapped = N.addNotificationResponseReceivedListener(open);

    // App was launched by tapping a notification.
    if (!handledColdStart.current) {
      handledColdStart.current = true;
      N.getLastNotificationResponseAsync()
        .then((last) => {
          if (last) setTimeout(() => open(last), 600); // let the role's navigator mount first
        })
        .catch(() => {});
    }

    return () => {
      received.remove();
      tapped.remove();
    };
  }, [role]);
}
